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
const lines = inputLines.length;
const width = inputLines[0].length;

function index(row: number, col: number): number | null {
    if (col < 0 || col >= width) {
        return null;
    }
    return row * width + col % width;
}

// Returns [row, col];
function point(index: number) {
    return [Math.floor(index / width), index % width];
}

function nextRowIndex(index: number) {
    const nextRow = index + width;
    if (nextRow >= lines * width) {
        return null;
    }

    return nextRow;
}


interface Beam {
    idx: number,
    timelines: number,
}

const beams = new Map<number, Beam>();   // All beams (inactive and active), by index
const activeBeams = new Array<Beam>();   // Active beams (ordered, hence no set)
const splitters = new Set<number>();
const splittersHandled = new Array<number>();

function createBeam(idx: number, timelines: number): Beam {
    const beam = {
        idx,
        timelines,
    }

    activeBeams.push(beam);
    beams.set(idx, beam);

    return beam;
}

// 7.1
let splits = 0;

function printDebugMap(): void {
    if (PROD) {
        return;
    }

    const outputCollapseWorkaround = tk.fill(Array(width), ' ').join('');
    for (let r = 0; r < lines; r++) {
        let line = "";
        for (let c = 0; c < width; c++) {
            const idx = index(r, c) as number;

            let char = ' . ';
            if (beams.has(idx)) {
                const beam = beams.get(idx);
                char = r === 0 ? ' S ' : tk.pad(beam!.timelines.toString(), 3);
            } else if (splitters.has(idx)) {
                char = ' ^ ';
            }

            line += char;
        }

        // Add changing suffix of whitespace, so that VSCode output does not collapse equal lines
        line = line + outputCollapseWorkaround.substring(0, r);
        console.debug(line);
    }
}

// Parse
for (let row = 0; row < lines; row++) {
    const line = inputLines[row];
    for (let col = 0; col < width; col++) {
        let idx;
        const char = line[col];
        switch (char) {
            case '.':
                break;
            case '^':
                idx = index(row, col) as number;
                splitters.add(idx);
                break;
            case 'S':
                idx = index(row, col) as number;
                createBeam(idx, 1);
                break;
            default:
                throw new Error(`WTF is at [${row},${col}]?`)
        }
    }
}

// Initial Map
printDebugMap();

// 7.2
const finalizingBeams = new Array<Beam>();

// Stepping through
while (activeBeams.length > 0) {

    // Get oldest beam
    const beam = activeBeams.shift();
    if (beam == null) {
        throw new Error("Invalid Beam, this should not be.");
    }

    const indexBelow = nextRowIndex(beam.idx);

    // Last row
    if (indexBelow == null) {
        finalizingBeams.push(beam);
        continue;
    }

    const isSplitter = splitters.has(indexBelow);
    if (isSplitter) {
        splittersHandled.push(indexBelow);
        splits++;
        // Split left and  right
        const [yb, xb] = point(indexBelow);

        const leftBelow = index(yb, xb - 1);
        const rightBelow = index(yb, xb + 1);

        if (leftBelow != null) {
            const beamLeftBelow = beams.get(leftBelow);

            if (beamLeftBelow) {
                beamLeftBelow.timelines += beam.timelines;
            } else {
                createBeam(leftBelow, beam.timelines);
            }
        }

        if (rightBelow != null) {
            const beamRightBelow = beams.get(rightBelow);

            if (beamRightBelow) {
                beamRightBelow.timelines += beam.timelines;
            } else {
                createBeam(rightBelow, beam.timelines);
            }
        }
    } else if (beams.has(indexBelow)) {
        // There is already one below, add timelines
        const beamBelow = beams.get(indexBelow)!
        beamBelow.timelines += beam.timelines;
    } else {
        // Continue onward
        createBeam(indexBelow, beam.timelines);
    }

    console.debug();
    printDebugMap();
}

console.log("Beams Spawns: " + beams.size)
console.log("Splits: " + splits);
//console.debug("Splitters: ", tk.countBy(splittersHandled, m => m));
console.log("Timelines: " + tk.sumBy(finalizingBeams, b => b.timelines));

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");