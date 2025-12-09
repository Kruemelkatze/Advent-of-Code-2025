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

// Get all edges
type Edge = [Point, Point];
const edges = points.map((v, i) => [v, points[(i + 1) % points.length]] as Edge); // Wraps around
console.debug(edges);

// Quick lookup
const edgesByCol = new Map<number, Edge[]>();
const edgesByRow = new Map<number, Edge[]>();

for (const edge of edges) {
    const [[pax, pay], [pbx, pby]] = edge;

    if (pax === pbx) {
        const colEdges = edgesByCol.get(pax) || [];
        colEdges.push(edge);
        edgesByCol.set(pax, colEdges);
    } else if (pay === pby) {
        const rowEdges = edgesByRow.get(pay) || [];
        rowEdges.push(edge);
        edgesByRow.set(pay, rowEdges);
    }
}

console.debug(edgesByCol);
console.debug(edgesByRow);

function isOnEdge(point: Point, edge: Edge) {
    const [px, py] = point;
    const [[pax, pay], [pbx, pby]] = edge;

    return py === pay && pay === pby && tk.inRange(px, Math.min(pax, pbx), Math.max(pax, pbx)) ||
        px === pax && pax === pbx && tk.inRange(py, Math.min(pay, pby), Math.max(pay, pby));
}

function isOnAnyEdge(point: Point) {
    return isOnColEdge(point) || isOnRowEdge(point);

}

function isOnColEdge(point: Point) {
    return edgesByCol.get(point[0])?.some(e => isOnEdge(point, e)) || false;
}

function isOnRowEdge(point: Point) {
    return edgesByRow.get(point[1])?.some(e => isOnEdge(point, e)) || false;
}


function spaceDist(a: Point, b: Point): number {
    let dX = Math.sign(b[0] - a[0]); // sign(0) === 0, thanks JS/TS
    let dY = Math.sign(b[1] - a[1]);

    let walker = [...a] as Point;
    while (dX || dY) {
        if (dX != 0) {
            walker[0] += dX;
            dX = isOnColEdge(walker) ? 0 : dX;
        }

        if (dY != 0) {
            walker[1] += dY;
            dY = isOnRowEdge(walker) ? 0 : dY;
        }
    }

    return areadist(a, walker);
}


// 9.2
const maxDistance: [Point, Point, number] = [points[0], points[0], 0];
//const distances: number[][] = [];
for (let i = 0; i < points.length; i++) {
    //const di: number[] = [];
    //distances[i] = di;

    const a = points[i];
    for (let j = i + 1; j < points.length; j++) {
        const b = points[j]
        const dist = spaceDist(a, b);
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