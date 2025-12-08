import * as tk from "jsr:@es-toolkit/es-toolkit";
import { default as kdTreeExport } from "npm:kd-tree-javascript@1.0.3";
import { exists } from "jsr:@std/fs/exists";

const { kdTree } = kdTreeExport;

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

// points are of type [x,y,z,cid]   // cid ... circuit id
interface Point {
    x: number,
    y: number,
    z: number,
    id: number,
    cid: number,
}

function pts(pt: Point, cid = false) {
    return cid ? `${pt.x},${pt.y},${pt.z}(${pt.cid})` : `${pt.x},${pt.y},${pt.z}`;
}

const points = inputLines.map((line, index) => [...line.split(',').map(n => +n), index + 1]).map(([x, y, z, cid]) => ({ x, y, z, id: cid, cid })) as Point[];
const circuits = new Map<number, Set<Point>>(points.map(p => ([p.cid as number, new Set<Point>([p])])));

function distSquared(a: Point, b: Point) {
    if (a.id === b.id) {
        return Number.MAX_SAFE_INTEGER;
    }

    return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
}

function dist(a: Point, b: Point) {
    return Math.sqrt(distSquared(a, b));
}

// Use KDT from a package. I could reimplement it from the definition on Wikipedia, but that is not the goal here. Also, it's 22:30.
const kdt = new kdTree(points.slice(), distSquared, ["x", "y", "z"]);// kdt changes points by sorting, it seems

const neighbours = new Map<Point, [Point, number][]>(); // Min Heap would be great. Thx for nothing, TS

function updateNearestNeighboursForPoint(point: Point) {
    const nearestPoints = tk.sortBy(kdt.nearest(point, 1).filter((q: any) => q[1] !== 0), [(q: any) => q[1]]);
    neighbours.set(point, nearestPoints);
}

for (const point of points) {
    updateNearestNeighboursForPoint(point);

    if (PROD) {
        continue;
    }
    const [nearest, dsqr] = neighbours.get(point)![0];
    console.debug(pts(point), " - ", pts(nearest), " : ", Math.sqrt(dsqr));
}

let nearestNeighbour: [Point, Point, number] | null = null;
function updateNearestNeighbour() {
    nearestNeighbour = null;

    let currentMin = Number.MAX_SAFE_INTEGER;
    let currentMinEntry: [Point, [Point, number][]] | null = null;
    for (const entry of neighbours.entries()) {
        const dist = entry[1][0][1]; // FU nesting
        if (dist < currentMin) {
            currentMin = dist;
            currentMinEntry = entry;
        }
    }

    if (currentMinEntry) {
        return nearestNeighbour = [currentMinEntry[0], currentMinEntry[1][0][0], currentMinEntry[1][0][1]];
    }

    return null;
}





const maxConnections = PROD ? 1000 : 10;
let connections = 0;

nearestNeighbour = updateNearestNeighbour();

console.debug();


while (connections < maxConnections && nearestNeighbour != null) {
    const [a, b, dist] = nearestNeighbour
    if (a.cid === b.cid) {
        continue;
    }

    // Migrate all points from one cid to the other
    const circuitA = circuits.get(a.cid)!;
    const circuitB = circuits.get(b.cid)!;

    console.debug(`Merging ${pts(a)} and ${pts(b)}`);
    console.debug(`Moved from ${b.cid} to ${a.cid}: ${[...circuitB.values()].map(p => pts(p)).join(' ')}`);
    console.debug();

    for (const circuitBEntry of circuitB.values()) {
        circuitBEntry.cid = a.cid;
        circuitA.add(circuitBEntry);
    }

    circuitB.clear();

    // Update all affected points
    for (const affected of circuitA.values()) {
        updateNearestNeighboursForPoint(affected);
    }

    nearestNeighbour = updateNearestNeighbour();
    connections++;
}

console.log(`Stopped after ${connections} connections`);

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");