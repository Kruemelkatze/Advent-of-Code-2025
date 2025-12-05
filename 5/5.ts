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

let ranges = new Array<[number, number]>();
const ids = new Set<number>();

let hadDelimiter = false;
for (const line of inputLines) {
    if (hadDelimiter) {
        ids.add(+line);
    } else if (!line) {
        hadDelimiter = true;
    } else {
        // Range
        const range = line.split('-').map(v => +v) as [number, number];
        ranges.push(range);
    }
}

// Merge overlaps, just because
console.debug(ranges);

ranges = tk.sortBy(ranges, ['0', '1']);
console.debug(ranges);

const mergedRanges = new Array<[number, number]>();
for (const range of ranges) {
    const lastRange = mergedRanges[mergedRanges.length - 1];
    // Start condition
    if (!lastRange) {
        mergedRanges.push(range);
        continue;
    }

    // if there is an overlap (thank you, to all event planning code I have written in the past, for hardwiring that formula in my brain)
    if (range[0] <= lastRange[1] && range[1] >= lastRange[0]) {
        lastRange[0] = Math.min(lastRange[0], range[0]); // Should never be the case due to sorting, but just to be save.
        lastRange[1] = Math.max(lastRange[1], range[1]);
    } else {
        // Else: add range
        mergedRanges.push(range);
    }
}

ranges = mergedRanges;
console.debug(ranges);

// Now iterate ids
console.debug("Ids: ", ids);
const invalidIds = new Set<number>(); // Store them, maybe we need them for part 2?
const validIds = new Set<number>();
for (const id of ids) {
    const isValid = ranges.some(([from, to]) => id >= from && id <= to);

    const set = isValid ? validIds : invalidIds;
    set.add(id);
}

console.debug("Valid Ids: ", validIds);
console.debug("Invalid Ids: ", invalidIds);
console.log("# ValidIds: ", validIds.size);


// 4.2: Simply count ranges? Can't believe merging ranges before actually made things that easy.
const numberOfValidIdsInRanges = tk.sumBy(ranges, ([from, to]) => to - from + 1);
console.log("Fresh: ", numberOfValidIdsInRanges);










// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");