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
const edges = new Map<number, Map<number, number>>();

function distSquared(a: Point, b: Point) {
    return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)
}

// No optimization as of now, just want to get it done

for (let i = 0; i < points.length; i++) {
    const pointI = points[i];

    const ie = new Map<number, number>();
    edges.set(i, ie);

    for (let j = i + 1; j < points.length; j++) {
        const pointJ = points[j];
        const dist = distSquared(pointI, pointJ);
        ie.set(j, dist);

        console.debug(dist === getDistance(i, j) && dist === getDistance(j, i));
    }
}

function getDistance(a: number, b: number) {
    if (a > b) {
        [a, b] = [b, a];
    }

    return edges.get(a)!.get(b);
}

const flatEdges = [];
for (const [i, js] of edges.entries()) {
    for (const [j, dist] of js.entries()) {
        flatEdges.push([i, j, dist]);
    }
}
const sortedEdges = tk.sortBy(flatEdges, [fe => fe[2]])

let previouslyConnected: [Point, Point] = [points[0], points[0]];
function tryConnect(i: number, j: number) {
    const a = points[i];
    const b = points[j];

    if (a.cid === b.cid) {
        console.debug(`Already connected ${pts(a)} and ${pts(b)}`);
        return;
    }

    previouslyConnected = [a, b];

    // Migrate all points from one cid to the other
    const aid = a.cid;
    const bid = b.cid;
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
    circuits.delete(bid);
}


// 8.1
const maxConnections = PROD ? 1000 : 10;

const smallestEdges = sortedEdges.slice(0, maxConnections);
console.debug(smallestEdges)

for (const [i, j, dist] of smallestEdges) {
    tryConnect(i, j);
}

const howManyCircuits = 3;
const largestCircuits = tk.takeRight(tk.sortBy([...circuits.values()], [ps => ps.size]), howManyCircuits);
//console.debug(largestCircuits);
console.log("Product: ", largestCircuits.reduce((prev, cur) => prev * cur.size, 1));

// 8.2
let e = smallestEdges.length;
while (circuits.size > 1 && e < sortedEdges.length) {
    const [i, j, dist] = sortedEdges[e];
    tryConnect(i, j);
    e++;
}


console.log("Last connected: ", previouslyConnected);
console.log("x product: ", previouslyConnected[0].x * previouslyConnected[1].x);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");