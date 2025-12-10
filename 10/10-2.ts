import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";
// import { Queue } from 'jsr:@cm-iv/queue';
import { PriorityQueue } from 'npm:@datastructures-js/priority-queue';



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

const joltageSegmentSize = 4;
const joltageSegmentDec = Math.pow(10, joltageSegmentSize);
const joltageSegmentBigInt = BigInt(joltageSegmentDec);

type State = number;
type Button = number;
type Joltage = bigint; // Encoded as % 10^joltageSegmentSize units, as each joltage <= 999

type Machine = {
    stateSize: number,
    targetState: State,
    buttons: Button[],
    joltages: Joltage,
}


const splitRegex = /\[([\.#]+)\] (.+) \{(.+)\}$/;
const machines = inputLines.map(line => {
    const [_, targetStr, buttonsStr, joltagesStr] = line.match(splitRegex)!;

    const stateSize = targetStr.length;
    const targetState = +("0b" + targetStr.replaceAll('.', '0').replaceAll('#', '1')); // poor cat's binary parsing =)
    const buttons = buttonsStr.replace(/[\(\)]/ig, '').split(' ').map(str => str.split(',').reduce((prev, char) => prev | 1 << (stateSize - 1) >> (+char), 0));
    const joltages = BigInt(joltagesStr.split(',').map(js => js.padStart(joltageSegmentSize, '0')).reverse().join(''));

    return {
        stateSize,
        targetState,
        buttons,
        joltages,
    } as Machine;
});

function applyButton(button: Button, state: State): State {
    return state ^ button;
}

function applyJoltageButton(m: Machine, button: Button, joltage: Joltage): Joltage {
    const segments = m.stateSize;

    let newJoltageStr = "";
    for (let s = 0; s < segments; s++) {
        let segValue = Number(joltage / pow(joltageSegmentBigInt, s) % joltageSegmentBigInt);
        const bs = 1 << (segments - 1) >> s;
        if (button & bs) {
            segValue++;
        }

        newJoltageStr = segValue.toString().padStart(joltageSegmentSize, '0') + newJoltageStr;
    }

    return BigInt(newJoltageStr);
}

// let state = 0;
// const buttons = machines[2].buttons;
// console.debug(state.toString(2).padStart(machines[2].stateSize, '0'));
// state = applyButton(buttons[1], state);
// console.debug(state.toString(2).padStart(machines[2].stateSize, '0'));
// state = applyButton(buttons[2], state);
// console.debug(state.toString(2).padStart(machines[2].stateSize, '0'));

function log10(bigint: bigint): number {
    if (bigint < 0n) return NaN;
    const s = bigint.toString(10);

    return s.length + Math.log10(+ ("0." + s.substring(0, 15)));
}

function pow(bigint: bigint, power: number): bigint {
    let res = 1n;
    for (let p = 0; p < power; p++) {
        res *= bigint;
    }

    return res;
}


function heuristic(a: Joltage, b: Joltage): number {
    const maxLog = Math.ceil(Math.max(log10(a), log10(b))) + 1;
    const segments = Math.ceil(maxLog / joltageSegmentSize);

    let diff = 0;
    for (let s = 0; s < segments; s++) {
        const na = Number(a / pow(joltageSegmentBigInt, s) % joltageSegmentBigInt);
        const nb = Number(b / pow(joltageSegmentBigInt, s) % joltageSegmentBigInt);

        diff += Math.abs(na - nb);
    }

    return diff;
}

//console.log(heuristic(10 0011 0011 0005 0010 0005n, 11 0021 0012 0005 0010 0006n)); // should be 13 = 1 + 10 + 1 + 0 + 0 + 1
//console.log(heuristic(1000110011000500100005n, 1100210012000500100006n)); // should be 13 = 1 + 10 + 1 + 0 + 0 + 1

//bfs(machines[0], 10000);

// let j = 0n;
// j = applyJoltageButton(m, b[0], j);
// j = applyJoltageButton(m, b[1], j);
// j = applyJoltageButton(m, b[1], j);
// j = applyJoltageButton(m, b[1], j);
// j = applyJoltageButton(m, b[3], j);
// j = applyJoltageButton(m, b[3], j);
// j = applyJoltageButton(m, b[3], j);
// j = applyJoltageButton(m, b[4], j);
// j = applyJoltageButton(m, b[5], j);
// j = applyJoltageButton(m, b[5], j);
// console.log(j);
// console.log(m.joltages)


function bfs(machine: Machine, maxDepth: number = 30): number | null {
    const Q = new PriorityQueue<bigint>((a, b) => Number((a % joltageSegmentBigInt) - (b % joltageSegmentBigInt)));
    const start: Joltage = 0n;

    const toId = (s: Joltage, d: bigint, h: bigint) => (s * joltageSegmentBigInt + d) * joltageSegmentBigInt + h;
    const fromId = (id: bigint) => [id / (joltageSegmentBigInt * joltageSegmentBigInt), id / joltageSegmentBigInt % joltageSegmentBigInt, id % joltageSegmentBigInt];

    //console.debug(toId(123n, 50n, 10n));
    //console.debug(fromId(12300500010n));

    const startId =toId(start, 0n, BigInt(heuristic(start, machine.joltages)));
    Q.enqueue(startId);
    while (!Q.isEmpty()) {
        const [v, depth, heu] = fromId(Q.dequeue()!);
        const buttons = machine.buttons;
        if (maxDepth <= depth) {
            continue;
        }

        const nextStates = buttons.map(b => applyJoltageButton(machine, b, v));

        const nextD = depth + BigInt(1);
        for (const nextState of nextStates) {
            const nextHeu = heuristic(machine.joltages, nextState);
            // Heuristic should be monotonous
            if (nextHeu === 0) {
                return Number(nextD);
            } else if (nextHeu > heu) {
                continue;
            }

            Q.enqueue(toId(nextState, nextD, BigInt(nextHeu)));
        }
    }
    return null;
}

const solutionDepths = machines.map(machine => bfs(machine))
console.log(solutionDepths);
console.log(tk.sum(solutionDepths.map(x => x != null ? x : 0)));



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");