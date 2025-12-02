import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Config ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const PROD = Deno.args.some((arg) => arg === "prod");
const inputFile = PROD ? "input.txt" : "input-test.txt";
console.log(`Using ${inputFile} (${PROD ? "PROD" : "TEST"})`);

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

const ranges = inputLines[0].split(",").map(line => {
    const range = line.split("-").map(x => +x);
    range.push(1 + Math.floor(Math.log10(range[0])));
    range.push(1 + Math.floor(Math.log10(range[1])));
    return range;
})

console.dir(ranges);

const invalids = [];
let invalidSum = 0;
let totalNumbers = 0;
let totalChecks = 0;

for (const [from, to, digitsFrom, digitsTo,] of ranges) {
    totalNumbers += to - from;
    // Skipping ids with uneven number of digits
    if (digitsFrom === digitsTo && (digitsFrom % 2) === 1) {
        //console.log(`Skipping ${from}-${to}`);
        continue;
    }

    // 1.1
    // Naive approach: iterate all numbers
    for (let num = from; num <= to; num++) {
        totalChecks++;
        const isDual = checkDualRepetition(num);
        if (isDual) {
            invalids.push(num);
            invalidSum += num;
        }
    }
}

console.dir(invalids);
console.log(`Total IDs: ${totalNumbers}`)
console.log(`Total ID checks: ${totalChecks}`)
console.log(`Invalids: ${invalids.length}`)
console.log(`Invalid Sum: ${invalidSum}`)


// console.log(checkDualRepetition(115));
// console.log(checkDualRepetition(99));
// console.log(checkDualRepetition(123123));
// console.log(checkDualRepetition(38593859));
// console.log(checkDualRepetition(38593856));
// console.log(checkDualRepetition(385938564));


function checkDualRepetition(num: number) {
    const numberOfDigits = 1 + Math.floor(Math.log10(num));
    if (numberOfDigits % 2 === 1) {
        //console.log(`${num}'s digit count is uneven.`)
        return false;
    }

    const potency = Math.pow(10, numberOfDigits / 2);
    const leftHalf = Math.floor(num / potency);
    const rightHalf = num % potency;

    //console.log(`${leftHalf}-${rightHalf}`);
    return leftHalf === rightHalf;
}



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");