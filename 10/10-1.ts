import * as tk from "jsr:@es-toolkit/es-toolkit";
import { exists } from "jsr:@std/fs/exists";
import { Queue } from 'jsr:@cm-iv/queue';

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

type State = number;
type Button = number;
type Joltages = number[];

type Machine = {
    stateSize: number,
    targetState: State,
    buttons: Button[],
    joltages: Joltages,
}

const splitRegex = /\[([\.#]+)\] (.+) \{(.+)\}$/;
const machines = inputLines.map(line => {
    const [_, targetStr, buttonsStr, joltagesStr] = line.match(splitRegex)!;

    const stateSize = targetStr.length;
    const targetState = +("0b" + targetStr.replaceAll('.', '0').replaceAll('#', '1')); // poor cat's binary parsing =)
    const buttons = buttonsStr.replace(/[\(\)]/ig, '').split(' ').map(str => str.split(',').reduce((prev, char) => prev | 1 << (stateSize - 1) >> (+char), 0));
    const joltages = joltagesStr.split(',').map(j => +j);

    return {
        stateSize,
        targetState,
        buttons,
        joltages,
    }
});

// 111011

function applyButton(button: Button, state: State): State {
    return state ^ button;
}

console.debug(machines);

// let state = 0;
// const buttons = machines[2].buttons;
// console.debug(state.toString(2).padStart(machines[2].stateSize, '0'));
// state = applyButton(buttons[1], state);
// console.debug(state.toString(2).padStart(machines[2].stateSize, '0'));
// state = applyButton(buttons[2], state);
// console.debug(state.toString(2).padStart(machines[2].stateSize, '0'));


function bfs(machine: Machine, maxDepth: number = 30): number | null {
    const Q = new Queue<[State, number]>();
    const startState: State = 0;
    Q.enqueue([startState, 0]);

    while (Q.peek() != null) {
        const [v, depth] = Q.dequeue() as [State, number];
        const buttons = machine.buttons;

        if (maxDepth <= depth) {
            continue;
        }

        for (const button of buttons) {
            const newState = applyButton(button, v);
            const newDepth = depth + 1;
            if (machine.targetState === newState) {
                return newDepth;
            }

            Q.enqueue([newState, newDepth]);
        }
    }

    return null;
}

const solutionDepths = machines.map(machine => bfs(machine));
console.log(solutionDepths);
console.log(tk.sum(solutionDepths.map(x => x != null ? x : 0)));



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Here were Dragons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
console.timeEnd("time");