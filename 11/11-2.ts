import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";
import { fft } from "npm:mathjs";

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Config ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const PROD = Deno.args.some((arg) => arg === "prod");
const inputFile = PROD ? "input.txt" : "input-test.11-2.txt";
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
let edgeCount = 0;

for (const line of inputLines) {
    const [name, connectionsStr] = line.split(": ");
    const connectionNames = connectionsStr.split(' ');

    const device: Device = devices.get(name) ?? {
        name,
        connections: null!,
    };

    const connections = connectionNames.map(cn => {
        edgeCount++;
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

console.log("Edges: " + edgeCount)


const maxDepth = devices.size;
const targetNode = devices.get('out')!;


const resultCache = new Map<string, number>();
function getCacheKey(n: Device, dac: boolean, fft: boolean) {
    return n.name + (dac ? "d" : "-") + (fft ? "t" : "-");
}

let calls = 0;
function dfsCount(node: Device, dacFound: boolean, fftFound: boolean): number {
    calls++;
    if (node.name === "dac") {
        dacFound = true;
    } else if (node.name === "fft") {
        fftFound = true;
    }

    const cacheKey = getCacheKey(node, dacFound, fftFound);
    const cached = resultCache.get(cacheKey);

    if (cached !== undefined) {
        return cached;
    }

    if (node === targetNode) {
        const val = (dacFound && fftFound) ? 1 : 0;
        resultCache.set(cacheKey, val);
        return val;
    }

    let count = 0;
    for (const next of node.connections) {
        count += dfsCount(next, dacFound, fftFound);
    }

    resultCache.set(cacheKey, count);

    return count;
}

// 11.2: Find all from svr to out and filter afterwards
const serverNode = devices.get("svr")!;
// Faster would be to flag them during DFS, but that would require refactoring to returning an object or triple, not only the path
const count = dfsCount(serverNode, false, false)!;
console.log("11.2: Valid server paths: " + count)
console.log("DFS calls in total: " + calls);


// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");