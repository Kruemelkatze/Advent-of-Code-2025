import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Config ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const PROD = Deno.args.some((arg) => arg === "prod");
const inputFile = PROD ? "input.txt" : "input-test.11-1.txt";
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

type Device = {
    name: string,
    connections: Device[],
}

const devices = new Map<string, Device>();

for (const line of inputLines) {
    const [name, connectionsStr] = line.split(": ");
    const connectionNames = connectionsStr.split(' ');

    const device: Device = devices.get(name) ?? {
        name,
        connections: null!,
    };

    const connections = connectionNames.map(cn => {
        let next = devices.get(cn);
        if (next) {
            return next;
        }

        next = {
            name: cn,
            connections: []
        };
        devices.set(cn, next);
        return next;
    })

    device.connections = connections;
    devices.set(name, device);
}

const maxDepth = devices.size;
const targetNode = devices.get('out')!;


// I used and scrapped tk.memoize, as I thought it does not quite work with my recursive approach...
// ... turned out, I made a bug when preparing for memoization (originally, I reused the arrays returned by
// the children, which would 100% have broken memoization).
const resultCache = new Map<string, Device[][] | null>();

// 11.1 find all paths by DFS
function dfsAll(node: Device, depthRemaining: number): Device[][] | null {
    const cached = resultCache.get(node.name);

    if (cached !== undefined) {
        return cached;
    }

    if (node === targetNode) {
        const found = [[node]];
        resultCache.set(node.name, found);
        return found;
    }

    if (depthRemaining <= 0) {
        return null;
    }

    let solutions: Device[][] | null = null;
    for (const next of node.connections) {
        const solutionsInChild = dfsAll(next, depthRemaining - 1);
        if (solutionsInChild == null) {
            continue;
        }

        solutions = solutions ?? [];
        for (const childSolution of solutionsInChild) {
            solutions.push([...childSolution, node]);
        }
    }

    resultCache.set(node.name, solutions);

    return solutions;
}

//11.1
const startNode = devices.get('you')!;
const allPaths = dfsAll(startNode, maxDepth);
console.debug(allPaths);
console.log("11.1: Number of Paths: " + allPaths?.length);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");