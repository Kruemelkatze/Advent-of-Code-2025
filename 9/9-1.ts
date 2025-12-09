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
type Point = [x: number, y: number];

function mdist(a: Point, b: Point) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function areadist(a: Point, b: Point) {
    return (Math.abs(a[0] - b[0]) + 1) * (Math.abs(a[1] - b[1]) + 1)
}

const points = inputLines.map(l => l.split(',').map(d => +d) as Point);


// 9.1
const maxDistance: [Point, Point, number] = [points[0], points[0], 0];
//const distances: number[][] = [];
for (let i = 0; i < points.length; i++) {
    //const di: number[] = [];
    //distances[i] = di;

    const a = points[i];
    for (let j = i + 1; j < points.length; j++) {
        const b = points[j]
        const dist = areadist(a, b);
        //di[j] = dist;

        if (dist > maxDistance[2]) {
            maxDistance[2] = dist;
            maxDistance[1] = b;
            maxDistance[0] = a;
        }
    }
}

console.log("Max distance between ", maxDistance[0], " and ", maxDistance[1]);
console.log(maxDistance[2]);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");