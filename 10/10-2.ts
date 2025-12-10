import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";
import { create, all, map } from 'npm:mathjs';
const math = create(all);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Config ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const PROD = Deno.args.some((arg) => arg === "prod");
const inputFile = PROD ? "input.txt" : "input-test.txt";
console.log(`Using ${inputFile} (${PROD ? "PROD" : "TEST"})`);

console.debug = (...args: any[]) => PROD ? null : console.log(...args);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Setup ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
if (!await exists(inputFile)) {
    console.error(`Where the fuck is ${inputFile}???`);
    Deno.exit(1);
}

const input = await Deno.readTextFile(inputFile);
const inputLines = input.trim().split(/\r?\n/g).map((l) => l.trim());
console.log(`Input lines: ${inputLines.length}`);

console.time("time");
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here be Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const joltageSegmentSize = 4;
const joltageSegmentDec = Math.pow(10, joltageSegmentSize);
const joltageSegmentBigInt = BigInt(joltageSegmentDec);

type Button = number[];
type Joltages = number[];

type Machine = {
    buttons: Button[],
    joltages: Joltages,
}


const splitRegex = /\[([\.#]+)\] (.+) \{(.+)\}$/;
const machines = inputLines.map(line => {
    const [, , buttonsStr, joltagesStr] = line.match(splitRegex)!;

    const buttons = buttonsStr.replace(/[\(\)]/ig, '').split(' ').map(str => str.split(',').map(s => +s));
    const joltages = joltagesStr.split(',').map(js => +js);

    return {
        buttons,
        joltages,
    } as Machine;
});

function solveMachineJoltagesLinearSystem(m: Machine) {
    // const coefficients = [
    //     [2, 3],
    //     [3, 2]
    // ];
    // const constants = [7, 8];
    //
    // =
    //
    // 2x + 3y = 7
    // 3x + 2y = 8

    //  xyzw   w   y w   z   z w   x z   x y   x y z w
    // [.##.] (3) (1,3) (2) (2,3) (0,2) (0,1) {3,5,4,7} -->
    //         a    b    c    d     e     f
    //
    //                  e + f = 3    x
    //      b             + f = 5    y
    //          c + d + e     = 4    z
    //  a + b +     d         = 7    w
    // 
    // [0,  0,  0,  0,  1,  1] = 3
    // [0,  1,  0,  0,  0,  1] = 5
    // [0,  0,  1,  1,  1,  0] = 4
    // [1,  1,  0,  1,  0,  0] = 7


    // 2 5 0 5 0

    const jolts = m.joltages.length;
    const numCoefficients = m.buttons.length;
    let coefficients: number[][] = Array.from({ length: jolts }, () => Array(m.buttons.length).fill(0));

    for (let b = 0; b < m.buttons.length; b++) {
        const button = m.buttons[b];
        for (const v of button) {
            coefficients[v][b] = 1;
        }
    }

    let constants = Array.from({ length: jolts }, (v, k) => m.joltages[k] || 0);

    //console.log(coefficients)
    //console.log(constants);

    //const solutions = math.usolve(coefficients, constants);
    const solver = new IntegerSolver(coefficients, constants);
    const solution = solver.solve();

    return solution;
}

// TBH: The solver below was done with AI, as I am not proficient in algebra
// and got determinant error after determinant error using pure Mathjs. Give me vectors, ffs.

// In Python, there would be ready to use ILP solvers in, but as mathjs does not offer one,
// using a generated one is ok for me. Especially, as everybode seems to be using Z3, lol 

// I am happy that I found out and defined the problem as a linear system.
class IntegerSolver {
    private matrix: number[][];
    private vector: number[];
    private numRows: number;
    private numCols: number;

    constructor(matrixData: number[][], vectorData: number[]) {
        this.matrix = matrixData;
        this.vector = vectorData;
        this.numRows = matrixData.length;
        this.numCols = matrixData[0].length;
    }

    public solve(): number[] | null {
        // 1. Create Augmented Matrix [A | b]
        const augmented = this.matrix.map((row, i) => [...row, this.vector[i]]);

        // 2. Gaussian Elimination to get Row Reduced Echelon Form (RREF)
        this.toRREF(augmented);

        // 3. Identify Pivot vs Free Variables
        const { pivots, freeVars } = this.identifyVariables(augmented);

        // 4. Determine Bounds for Search
        // The max value of any variable cannot exceed the max value in b (since A contains only non-negatives)
        const maxVal = Math.max(...this.vector) + 1;

        // 5. Recursive Search over Free Variables
        let bestSolution: number[] | null = null;
        let minSum = Infinity;

        // Helper to generate values for free vars and check solution
        const search = (freeVarIndex: number, currentFreeValues: Record<number, number>) => {
            // Base Case: All free variables have been assigned a value
            if (freeVarIndex === freeVars.length) {
                const candidate = this.calculateDependentVariables(augmented, pivots, currentFreeValues);
                if (candidate) {
                    const sum = candidate.reduce((a, b) => a + b, 0);
                    if (sum < minSum) {
                        minSum = sum;
                        bestSolution = candidate;
                    }
                }
                return;
            }

            // Recursive Step: Iterate possible integer values for this free variable
            // Optimisation: We iterate 0..maxVal. 
            // For highly underdetermined systems, this can be slow. 
            // But for 9x10 (Rank ~9), there is likely only 1 or 2 free vars, so it's instant.
            const colIndex = freeVars[freeVarIndex];
            for (let val = 0; val < maxVal; val++) {
                currentFreeValues[colIndex] = val;
                search(freeVarIndex + 1, currentFreeValues);

                // Pruning: If we already have a solution and this path is already heavier, break? 
                // (Skipped for simplicity, but good for large systems)
            }
        };

        search(0, {});
        return bestSolution;
    }

    // --- Core Math Logic ---

    private calculateDependentVariables(
        rref: number[][],
        pivots: Map<number, number>,
        freeValues: Record<number, number>
    ): number[] | null {
        const solution = new Array(this.numCols).fill(0);

        // Fill in the chosen free variable values
        for (const [col, val] of Object.entries(freeValues)) {
            solution[Number(col)] = val;
        }

        // Solve for Pivot Variables (working backwards from bottom rows up)
        // Row equation: 1*Pivot + c1*Free1 + c2*Free2 ... = Constant
        // Pivot = Constant - (c1*Free1 + ...)
        for (let row = this.numRows - 1; row >= 0; row--) {
            const pivotCol = this.getPivotColumn(rref[row]);
            if (pivotCol === -1) {
                // Check for inconsistency: Row of zeros = non-zero constant?
                if (Math.abs(rref[row][this.numCols]) > 1e-9) return null; // 0 = k (Impossible)
                continue;
            }

            let val = rref[row][this.numCols]; // Start with the constant (last column)

            // Subtract the contribution of all other variables in this row
            for (let col = pivotCol + 1; col < this.numCols; col++) {
                const coeff = rref[row][col];
                if (Math.abs(coeff) > 1e-9) {
                    val -= coeff * solution[col];
                }
            }

            // Check Integrity
            // 1. Must be integer
            if (Math.abs(val - Math.round(val)) > 1e-5) return null;
            val = Math.round(val);

            // 2. Must be non-negative
            if (val < 0) return null;

            solution[pivotCol] = val;
        }

        return solution;
    }

    // Converts matrix to RREF in-place (Gauss-Jordan)
    private toRREF(M: number[][]) {
        let lead = 0;
        const rowCount = M.length;
        const colCount = M[0].length;

        for (let r = 0; r < rowCount; r++) {
            if (colCount <= lead) return;
            let i = r;

            while (Math.abs(M[i][lead]) < 1e-9) {
                i++;
                if (rowCount === i) {
                    i = r;
                    lead++;
                    if (colCount === lead) return;
                }
            }

            // Swap rows
            [M[i], M[r]] = [M[r], M[i]];

            // Normalize row r
            const div = M[r][lead];
            for (let j = 0; j < colCount; j++) M[r][j] /= div;

            // Subtract row r from other rows
            for (let k = 0; k < rowCount; k++) {
                if (k !== r) {
                    const factor = M[k][lead];
                    for (let j = 0; j < colCount; j++) M[k][j] -= factor * M[r][j];
                }
            }
            lead++;
        }
    }

    private identifyVariables(rref: number[][]) {
        const pivots = new Map<number, number>(); // Map<RowIndex, ColIndex>
        const pivotCols = new Set<number>();

        for (let r = 0; r < this.numRows; r++) {
            const p = this.getPivotColumn(rref[r]);
            if (p !== -1) {
                pivots.set(r, p);
                pivotCols.add(p);
            }
        }

        const freeVars: number[] = [];
        for (let c = 0; c < this.numCols; c++) {
            if (!pivotCols.has(c)) freeVars.push(c);
        }

        return { pivots, freeVars };
    }

    private getPivotColumn(row: number[]): number {
        // Find first non-zero column in this row (ignoring the augmented constant column)
        for (let c = 0; c < this.numCols; c++) {
            if (Math.abs(row[c]) > 1e-9) return c;
        }
        return -1;
    }
}

//console.log(solveMachineJoltagesLinearSystem(machines[5]));

const solutions = machines.map(machine => solveMachineJoltagesLinearSystem(machine));
//console.log(solutions);
const failedSolutions: number[] = [];
solutions.forEach((s, i) => {
    if (!s) {
        failedSolutions.push(i + 1);
    }
});
console.log(tk.sum(tk.flatten(solutions).filter(x => x) as number[]));
console.log(failedSolutions)

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");