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

const banks = inputLines.map(line => line.split('').map(c => +c));
const maxRightsBanks = banks.map(bank => {
    //    8,1,8,1,8,1,9,1,1,1,1,2,1,1,1
    // -> 9,9,9,9,9,9,2,2,2,2,2,1,1,1,0 (last entry should be ignored anyway)
    const maxRights = [];

    for (let i = bank.length - 1; i >= 0; i--) {
        const maxRight = Math.max(bank[i + 1] || 0, maxRights[i + 1] || 0, 0);
        maxRights[i] = maxRight;
    }

    return maxRights;
});


for (let i = 0; i < banks.length; i++) {
    console.debug(banks[i].join());
    console.debug(maxRightsBanks[i].join());
}
console.debug(banks.length, maxRightsBanks.length);

const maxPerBank = banks.map((bank, bankIndex) => {
    const maxRights = maxRightsBanks[bankIndex];

    let max = 0;
    for (let i = 0; i < bank.length - 1; i++) {
        max = Math.max(max, bank[i] * 10 + maxRights[i]);
    }

    return max;
});

console.log(maxPerBank);
console.log(tk.sum(maxPerBank));



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");