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

const rotations = inputLines.map(def => (def[0] === 'L' ? -1 : 1) * +def.substring(1));

let state = 50;
let exactZeroCount = 0;
let passingZeroCount = 0;

for (let rot of rotations) {
    while (Math.abs(rot) >= 100) {
        rot = (Math.abs(rot) - 100) * Math.sign(rot);
        passingZeroCount++;
    }

    const previousSign = Math.sign(state);
    state = state + rot;
    const currentSign = Math.sign(state) * (state > 100 ? -1 : 1);

    // Normalize again
    state = (state + 100) % 100;

    // 1.1
    if (state === 0) {
        exactZeroCount++;
        passingZeroCount++;
        // 1.2
    } else if (previousSign !== currentSign && previousSign !== 0 && currentSign !== 0) {
        passingZeroCount++;
    }
}

// 1.1
console.log("Exact zeroes " + exactZeroCount);

// 1.2
console.log("Passing zeroes " + passingZeroCount);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");