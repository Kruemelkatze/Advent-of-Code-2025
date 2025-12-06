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
const inputLines = input.trim().split(/\r?\n/g);
console.log(`Input lines: ${inputLines.length}`);

console.time("time");
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here be Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// In case we need them
const operations = inputLines[inputLines.length - 1].split(/\s+/);

interface Problem {
    numbers: number[],
    cephalopodNumbers: number[],
    alignedLeft: boolean,
    operation: string,
    result?: number | null,
}

function perform(p: Problem, cephalopod = false) {
    const source = cephalopod ? p.cephalopodNumbers : p.numbers;

    const result = p.operation === '+'
        ? source.reduce((p, n) => p + n, 0)
        : source.reduce((p, n) => p * n, 1)

    return p.result = result;
}

const problems: Problem[] = []; // LTR
const numberLines = inputLines.slice(0, -1); // Omit operations line

// Not iterating line by line, but with "line cursor" to get individual columns
const inputWidth = tk.maxBy(numberLines, l => l.length)?.length || 0;
let colWidth = 0;

for (let c = 0; c <= inputWidth; c++) {
    // Iterate right until all lines show empty space
    if (c !== inputWidth && !numberLines.every(line => line[c] === ' ')) {
        colWidth++;
        continue;
    }

    // now, e.g. c === 3, take last colWidth
    const substrings = numberLines.map(line => line.substring(c, c - colWidth));
    const numbers = substrings.map(str => +str);
    const alignedLeft = substrings.every(str => str[0] !== ' ');
    const operation = operations[problems.length];

    // for 6.2, simply transpose the charArray... We could do some number crunching on base 10, but I don't care right now :)
    const charArrays = substrings.map(str => str.split(''))
    const transposedChars = charArrays[0].map((_, colIndex) =>
        charArrays.map(row => row[colIndex])
    );
    const cephalopodNumbers = transposedChars.map(line => +line.join('')).reverse();

    problems.push({
        numbers,
        cephalopodNumbers,
        alignedLeft,
        operation,
    });;

    colWidth = 0;
}

console.debug(problems)

// 6.1
const result = tk.sumBy(problems, p => perform(p, false));
console.log("Result: " + result)

// 6.2
const cephResult = tk.sumBy(problems, p => perform(p, true));
console.log("Cephalopod Result: " + cephResult)


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");