import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";

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

type Present = {
    variants: boolean[][][],
    size: number,
}

let mode: ('presents' | 'areas') = 'presents';
const presentDefs: string[][] = [];
const areaLines: string[] = [];
for (const line of inputLines) {
    if (mode === 'areas' || line.includes('x')) {
        mode = 'areas';
        areaLines.push(line);
    } else if (line.match(/^\d/)) {
        presentDefs.push([]);
    } else if (line) {
        presentDefs[presentDefs.length - 1].push(line);
    }
}


const presents: Present[] = [];
for (const presentLines of presentDefs) {
    const variant1 = presentLines.map(s => s.split('').map(c => c === '#' ? true : false));
    const variants: boolean[][][] = [];
    variants.push(variant1);
    variants.push(rotate(variants[variants.length - 1]));
    variants.push(rotate(variants[variants.length - 1]));
    variants.push(rotate(variants[variants.length - 1]));

    const size = tk.sumBy(tk.flatten(variant1), s => s ? 1 : 0);

    presents.push({ variants, size })
}

function rotate<T>(mat: T[][]): T[][] {
    // Assume square
    const newMat: T[][] = Array.from({ length: mat.length });
    newMat.forEach((_, i) => newMat[i] = Array.from({ length: mat.length }));

    // Transpose
    for (const r in mat) {
        for (const c in mat) {
            newMat[r][c] = mat[c][r];
        }
    }

    // Reverse each line
    for (const r in newMat) {
        newMat[r].reverse();
    }

    return newMat;
}

const fitting: boolean[] = [];
for (const areaLine of areaLines) {
    const [sizeStr, countsStr] = areaLine.split(': ');
    const [width, height] = sizeStr.split('x').map(c => +c);
    const counts = countsStr.split(' ').map(c => +c);

    const totalSlots = tk.sumBy(counts, (cnt, index) => presents[index]!.size * cnt);
    const area = width * height;

    const definitelyTooSmall = totalSlots > area;
    fitting.push(!definitelyTooSmall);
}


// We're not gonna solve the https://en.wikipedia.org/wiki/Bin_packing_problem here..
console.log("Results:   ", fitting);
console.log("Fitting #: ", tk.sumBy(fitting, f => f ? 1 : 0));

// I invested 60min in a brute force bin packing solution, then got spoiled by the Reddit frontpage that this AoC problem
// has a very limited and easy input. So there's that... =)


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");