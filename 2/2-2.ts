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

const ranges = inputLines[0].split(",").map(line => {
    const range = line.split("-").map(x => +x);
    range.push(1 + Math.floor(Math.log10(range[0])));
    range.push(1 + Math.floor(Math.log10(range[1])));
    return range;
})

//console.dir(ranges);

const invalids: number[] = [];
let invalidSum = 0;
let totalChecks = 0;

for (const [from, to, digitsFrom, digitsTo,] of ranges) {

    // 1.2
    // Naive approach: iterate all numbers
    for (let num = from; num <= to; num++) {
        totalChecks++;
        const isInvalid = checkAllRepetitions(num);
        if (isInvalid) {
            invalids.push(num);
            invalidSum += num;
        }
    }
}

console.debug("");
console.debug(invalids);
console.log(`Total ID checks: ${totalChecks}`)
console.log(`Invalids: ${invalids.length}`)
console.log(`Invalid Sum: ${invalidSum}`)

//console.debug("");
//console.debug(checkAllRepetitions(565656));
//console.debug(checkAllRepetitions(2121212121));
//console.debug(checkAllRepetitions(99));
//console.debug(checkAllRepetitions(111));
//console.debug(checkAllRepetitions(12341234));
//console.debug(checkAllRepetitions(123123123));
//console.debug(checkAllRepetitions(123123321));
//console.debug(checkAllRepetitions(121212121212));
//console.debug(checkAllRepetitions(1111111));


function checkAllRepetitions(num: number) {
    console.debug();
    // 1234 1234      -> 4
    // 123 123 123    -> 9
    // 12 12 12 12 12 -> 10
    const numberOfDigits = 1 + Math.floor(Math.log10(num));
    const divisors = getDivisors(numberOfDigits);
    console.debug(num, divisors);

    for (const divisor of divisors) {
        const divisorPotency = Math.pow(10, divisor);
        const repeatingPart = Math.floor(num / Math.pow(10, numberOfDigits - divisor));
        let numberOfParts = numberOfDigits / divisor;
        //console.debug(divisor, repeatingPart, numberOfParts);

        // there could be a special handling for divisor 2 and 1, but I don't care right now

        let numberRebuild = 0;
        for (let parts = 0; parts < numberOfParts; parts++) {
            const rebuildPart = repeatingPart * Math.pow(divisorPotency, parts);
            numberRebuild += rebuildPart;
            console.debug(divisor, numberRebuild);

            if (numberRebuild === num) {
                console.debug();
                return true;
            }
        }
    }

    return false;
}

function getDivisors(num: number) {
    // Naive approach, as the num is number of ditits, so quite low (<= 16)
    const divisors = [];
    for (let i = 1; i < num; i++) {
        if (num % i === 0) {
            divisors.push(i);
        }
    }

    return divisors.reverse();
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");