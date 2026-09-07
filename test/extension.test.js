const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');

let command;
class Position {
    constructor(line, character) { Object.assign(this, { line, character }); }
}
class Range {
    constructor(start, end) { Object.assign(this, { start, end }); }
}
const vscode = {
    Position, Range,
    EndOfLine: { LF: 1, CRLF: 2 },
    window: { activeTextEditor: undefined },
    workspace: {
        onWillSaveTextDocument: () => ({ dispose() {} })
    },
    commands: {
        registerCommand: (id, callback) => {
            assert.equal(id, 'newline.checkNewline');
            command = callback;
            return { dispose() {} };
        }
    }
};
const originalLoad = Module._load;
let activate;
try {
    Module._load = function (id, ...args) {
        return id === 'vscode' ? vscode : originalLoad.call(this, id, ...args);
    };
    ({ activate } = require('../out/extension'));
} finally {
    Module._load = originalLoad;
}
activate({ subscriptions: [] });

test('manual command safely returns without an active editor', () => {
    vscode.window.activeTextEditor = undefined;
    assert.doesNotThrow(() => command());
});

test('manual command still inserts a missing newline in the active editor', () => {
    const edits = [];
    vscode.window.activeTextEditor = {
        document: {
            isUntitled: false,
            eol: vscode.EndOfLine.LF,
            getText: () => { throw new Error('must not read the entire document'); },
            lineCount: 1,
            lineAt: () => ({ text: 'hello' })
        },
        edit: callback => {
            callback({ replace: (range, text) => edits.push({ range, text }) });
            return Promise.resolve(true);
        }
    };
    command();
    assert.deepEqual(edits, [{
        range: new Range(new Position(0, 5), new Position(0, 5)),
        text: '\n'
    }]);
});

test('manual command visits only the tail of a large document', () => {
    const counts = [];
    for (const bodyLines of [10, 1000000]) {
        let calls = 0;
        const edits = [];
        vscode.window.activeTextEditor = {
            document: {
                isUntitled: false, eol: vscode.EndOfLine.LF,
                getText: () => { throw new Error('must not read the entire document'); },
                lineCount: bodyLines + 3,
                lineAt: line => {
                    calls++;
                    assert.ok(line >= bodyLines);
                    return { text: line === bodyLines ? 'hello' : '' };
                }
            },
            edit: callback => {
                callback({ replace: (range, text) => edits.push({ range, text }) });
                return Promise.resolve(true);
            }
        };
        command();
        assert.deepEqual(edits, [{
            range: new Range(new Position(bodyLines + 1, 0), new Position(bodyLines + 2, 0)),
            text: ''
        }]);
        counts.push(calls);
    }
    assert.deepEqual(counts, [3, 3]);
});
