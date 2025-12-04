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

// M x N grid
const M = inputLines.length;
const N = inputLines[0].length;

// flat array
const map: number[] = []; // 0 ... empty,    1 ... roll,    1+n ... roll with n neighbours
for (let lineIndex = 0; lineIndex < inputLines.length; lineIndex++) {
    const line = inputLines[lineIndex];
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        map[lineIndex * M + charIndex] = char === '@' ? 1 : 0;
    }
}

function printMap() {
    tk.chunk(map, M).map(l => l.join("")).forEach(l => console.debug(l));
    console.debug();
}

printMap();

// Instead of iterating each cell and looking all directions, iterate directions (we did this in a previous AoC with the tree lookouts)
const directions = [
    [-1, 0], //L
    [1, 0], //R
    [0, -1], //U
    [0, 1], //D
    [-1, -1], //LU
    [-1, 1], //LD
    [1, -1], //RU
    [1, 1], //RD
];

// 4.1

for (const dir of directions) {
    const [lookX, lookY] = dir;

    for (let row = 0; row < M; row++) {
        const lookiRow = row + lookY;

        // Skip edges
        if (lookiRow < 0 || lookiRow >= M) {
            continue;
        }

        for (let col = 0; col < N; col++) {
            // Ignore empty spaces
            if (map[row * M + col] === 0) {
                continue
            }

            const lookiCol = col + lookX;

            // Skip edges
            if (lookiCol < 0 || lookiCol >= M) {
                continue;
            }

            const neighbour = map[lookiRow * M + lookiCol];
            if (neighbour > 0) {
                map[row * M + col]++;
            }
        }
    }
}

printMap();

const sumAccessible = tk.sumBy(map, x => (x > 0 && x < 5) ? 1 : 0); // > 0 = roll,    < 5 = < 4 neighbours
console.log(`Initially accessible: ${sumAccessible}`);
console.log()


// 4.2
const changedSlots = new Set<number>(); // Holds the set of slots that have been updated and need to be looked at
map.forEach((val, index) => val > 0 && val < 5 ? changedSlots.add(index) : null);
console.debug([...changedSlots]);

let steps = 0;
while (changedSlots.size > 0) {
    // Take random
    const index = changedSlots.values().next().value as number;
    const value = map[index];
    // And pop
    changedSlots.delete(index);

    // doesn't need an update (yet) or is an empty slot
    if (value === 0 || value >= 5) {
        continue;
    }

    // can be removed: remove and update neighbours
    map[index] = 0;
    for (const [dx, dy] of directions) {
        const [ix, iy] = [index % M, Math.floor(index / M)];

        const [nx, ny] = [ix + dx, iy + dy];

        if (nx < 0 || nx >= N || ny < 0 || ny >= M) {
            continue;
        }

        const neighbourIndex = ny * M + nx;

        let neighbour = map[neighbourIndex]; // Just for the record: I debuged for 15min until I found [index] here

        // reduce at most down to "filled"
        if (neighbour > 1) {
            neighbour--;
            map[neighbourIndex] = neighbour;

            changedSlots.add(neighbourIndex)
        }

    }

    printMap();

    steps++;
}

console.log(`Steps: ${steps}`);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");