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

const joltageSize = 12;

const banks = inputLines.map(line => line.split('').map(c => +c));

const joltages = banks.map(bank => {
    const joltage = bank.slice(0, joltageSize);

    for (let i = joltage.length; i < bank.length; i++) {
        // I used a linked list approach first, but that actually performed worse than a normal array due to the large number of indexed lookups.
        const newNumber = bank[i];

        console.debug(`${joltage.join('')} ${newNumber}`)

        for (let j = 0; j < joltage.length; j++) {
            const current = joltage[j] || 10;
            const next = joltage[j + 1] || newNumber;
            if (current < next) {
                joltage.splice(j, 1);
                break;
            }
        }

        if (joltage.length < joltageSize) {
            joltage.push(newNumber);
        }
    }

    console.debug(joltage.join(''));
    console.debug();

    return +joltage.join(''); // could also do a more sophisticated reduce, but I don't care.
})

const sum = tk.sum(joltages);
console.log(sum);

// 234234234234 2
// 342342342342 7
// 423423423427 8
// 434234234278

// take first 12
// while there is a new number x
//     remove first number a of first occurence of a,b where a<b, if none then remove last entry if x is larger (take b = x)
//     add x

// Very similar to max heap, though I'm not sure if I could use one in the implementation.



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");