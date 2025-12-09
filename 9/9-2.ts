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

function peq(a: Point, b: Point) {
    return a[0] === b[0] && a[1] === b[1];
}

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
//console.debug(edges);

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

function isOnEdge(point: Point, edge: Edge) {
    const [px, py] = point;
    const [[pax, pay], [pbx, pby]] = edge;

    return px === pax && py === pay || px === pbx && py === pby ||
        py === pay && pay === pby && tk.inRange(px, Math.min(pax, pbx), Math.max(pax, pbx)) ||
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

// Adapted from https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
function intersection(a: Edge, b: Edge, incl: boolean): Point | null {
    const [[afx, afy], [atx, aty]] = a;
    const [[bfx, bfy], [btx, bty]] = b;

    const dX: number = atx - afx;
    const dY: number = aty - afy;

    const determinant: number = dX * (bty - bfy) - (btx - bfx) * dY;
    if (determinant === 0)
        return null; // parallel lines

    const lambda: number = ((bty - bfy) * (btx - afx) + (bfx - btx) * (bty - afy)) / determinant;
    const gamma: number = ((afy - aty) * (btx - afx) + dX * (bty - afy)) / determinant;

    // check if there is an intersection
    if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1))
        return null;

    const intersect = [
        afx + lambda * dX,
        afy + lambda * dY,
    ] as Point;

    // if(!incl){
    //     return intersect;
    // }

    // Allow boundaries...
    if (peq(intersect, a[0]) || peq(intersect, a[1]) || peq(intersect, b[0]) || peq(intersect, b[1])) {
        return null;
    }

    return intersect;
}

function misguidedSpaceDist(a: Point, b: Point): number {
    // I thought too complicated and tried to find ANY biggest rectangle inside the polygon.
    // Would have worked too (somehow), but this is not required.
    let dX = Math.sign(b[0] - a[0]); // sign(0) === 0, thanks JS/TS
    let dY = Math.sign(b[1] - a[1]);

    const walker = [...a] as Point;
    while (dX || dY) {
        if (dX != 0) {
            walker[0] += dX;
            const obstacleOnX = isOnColEdge(walker); // || Check edges adj. to b if any intersect

            dX = obstacleOnX ? 0 : dX;
        }

        if (dY != 0) {
            walker[1] += dY;
            const obstacleOnY = isOnRowEdge(walker);  // || Check edges adj. to b if any intersect
            dY = obstacleOnY ? 0 : dY;
        }
    }

    return areadist(a, walker);
}

function isInsidePolygon(p: Point) {
    // The intersection code above gave different results in some edge cases.
    // So I reimplemented the intersection part of the inside check based on an existing Python Code
    const x = p[0], y = p[1];

    let inside = false;
    for (const [a, b] of edges) {
        const [ax, ay] = a;
        const [bx, by] = b;

        const intersect = ((ay > y) != (by > y))
            && (x < (bx - ax) * (y - ay) / (by - ay) + ax);
        if (intersect) {
            inside = !inside;
        }
    }

    return inside || isOnAnyEdge(p);


    // const randomDirection = [p[0], p[1] + 10000000];
    // const edge = [p, randomDirection] as Edge;
    // const intersections = tk.sumBy(edges, e => intersection(e, edge, true) ? 1 : 0);
    // return intersections % 2 === 1 || intersections === 0;
}

function spaceDist(a: Point, b: Point): number {
    const rectBlocked = isRectBlocked(a, b);
    //console.log(`${a.join(',')} - ${b.join(',')}: ${rectBlocked ? 'blocked' : 'valid'} `)
    return rectBlocked ? 0 : areadist(a, b);

}

function isRectBlocked(a: Point, b: Point): Point | null {
    const corners = [a, [a[0], b[1]], b, [b[0], a[1]]] as Point[];
    for (const c of corners) {
        if (!isInsidePolygon(c)) {
            return c;
        }
    }

    const cornerEdges = corners.map((v, i) => [v, corners[(i + 1) % corners.length]] as Edge)
    const relevantEdges = edges; // take all for now, but ignore those were "start" or "end" are "a" or "b"


    for (const re of relevantEdges) {
        if (re[0] == a || re[1] == a || re[0] == b || re[1] == b) {
            continue;
        }

        for (const ce of cornerEdges) {
            const is = intersection(ce, re, false);

            if (is) {
                return is;
            }
        }
    }
    return null;
}

//console.log(intersection([[7, 1], [11, 1]], [[10, 0], [10, 1]])); // Should be [10,1]

console.log(isRectBlocked(points[4], points[6]));

//console.log(isInsidePolygon([5,5]));
// const lineFill = "               ";
// for (let r = 0; r < 9; r++) {
//     let line = "";
//     for (let c = 0; c < 14; c++) {
//         line += isInsidePolygon([c, r]) ? 'X' : '.';
//     }

//     console.debug(line + lineFill.substring(0, r));
// }

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

// TBH, I expected this to be ultra-slow, since I multi-checked edges, points and inside/outside.
// But it ran throw in 651 ms

// I'll leave the dead and commented code here as a witness to my struggles.

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");