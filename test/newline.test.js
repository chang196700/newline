const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');
const path = require('node:path');

let enabled = true;
let extension;
let saveListener;
let regexRules = [];
let ignoreOnlyNewlines = true;
const warnings = [];
class Position {
    constructor(line, character) { Object.assign(this, { line, character }); }
}
class Range {
    constructor(start, end) { Object.assign(this, { start, end }); }
}
class TextEdit {
    constructor(range, newText) { Object.assign(this, { range, newText }); }
}
const vscode = {
    Position, Range, TextEdit,
    EndOfLine: { LF: 1, CRLF: 2 },
    extensions: { getExtension: () => extension },
    window: {
        showWarningMessage: message => {
            warnings.push(message);
            // The save listener must not wait for the user to dismiss the warning.
            return new Promise(() => {});
        }
    },
    workspace: {
        getConfiguration: () => ({ get: (key, fallback) =>
            key === 'fileRegexToIgnore' ? regexRules :
                key === 'ignoreOnlyNewlinesFile' ? ignoreOnlyNewlines :
                key === 'ignoreSourceControlledFiles' ? enabled : fallback }),
        onWillSaveTextDocument: listener => {
            saveListener = listener;
            return { dispose() {} };
        }
    }
};
const originalLoad = Module._load;
Module._load = function (id, ...args) {
    return id === 'vscode' ? vscode : originalLoad.call(this, id, ...args);
};
const { NewLine } = require('../out/newline');
Module._load = originalLoad;
const newline = new NewLine();

test('invalid regex rules do not interrupt saves or prevent later ignore matches', async () => {
    enabled = false;
    try {
        regexRules = [{ type: 'basename', regex: '[' }];
        let pending;
        saveListener({ document: document('last'), waitUntil: value => { pending = value; } });
        assert.ok(pending instanceof Promise);
        assert.equal((await pending).length, 1);
        assert.equal(warnings.length, 1);
        assert.ok(warnings[0].includes('newline.fileRegexToIgnore'));
        assert.ok(warnings[0].includes('"["'));

        for (const rule of [
            { type: 'basename', regex: '^file\\.txt$' },
            { type: 'fullName', regex: 'fixture[/\\\\]file\\.txt$' }
        ]) {
            regexRules = [{ type: 'basename', regex: '[' }, rule];
            saveListener({
                document: document('last'),
                waitUntil: () => assert.fail('matching ignore rule must skip save edits')
            });
        }
        assert.equal(warnings.length, 1, 'repeated saves must not repeat the warning');
        regexRules = [{ type: 'basename', regex: '(' }];
        saveListener({ document: document('last'), waitUntil: value => { pending = value; } });
        assert.equal((await pending).length, 1);
        assert.equal(warnings.length, 2, 'a different invalid pattern needs its own warning');
        assert.ok(warnings[1].includes('"("'));
    } finally {
        regexRules = [];
    }
});

function document(text) {
    const lines = text.split(/\r\n|\n/);
    return {
        fileName: path.resolve('fixture/file.txt'),
        uri: { scheme: 'file', fsPath: path.resolve('fixture/file.txt') },
        isUntitled: false, isClosed: false, version: 1,
        eol: text.includes('\r\n') ? 2 : 1,
        getText: () => { throw new Error('must not read the entire document'); }, lineCount: lines.length,
        lineAt: i => ({ text: lines[i] })
    };
}
function git(original) {
    enabled = true;
    extension = {
        isActive: true,
        exports: { getAPI: () => ({ repositories: [{
            rootUri: { fsPath: path.resolve('fixture') },
            show: async (ref, file) => {
                assert.equal(ref, '');
                assert.equal(file, path.resolve('fixture/file.txt'));
                if (original instanceof Error) { throw original; }
                return original;
            }
        }] }) }
    };
}

test('tracked files preserve unchanged endings, including unsaved body edits', async () => {
    for (const [before, after] of [
        ['first\nlast', 'changed\nlast'],
        ['first\nlast\n\n', 'inserted\nfirst\nlast\n\n'],
        ['first\nlast\n\n', 'last\n\n'],
        ['first\nlast\n\n', 'changed\r\nlast\r\n\r\n'],
        ['last', 'last']
    ]) {
        git(before);
        assert.deepEqual(await newline.getSaveEdits(document(after)), []);
    }
});

test('editing the final content line or trailing newlines permits cleanup', async () => {
    for (const [before, after] of [
        ['first\nlast', 'first\nchanged'],
        ['first\nlast', 'first\nlast\nappended'],
        ['first\nlast\n', 'first\nlast'],
        ['first\nlast\n', 'first\nlast\n\n'],
        ['first\nlast\n\n', 'first\nlast\n\n\n'],
        ['first\nlast', 'first']
    ]) {
        git(before);
        assert.equal((await newline.getSaveEdits(document(after))).length, 1);
    }
});

test('untracked files and unavailable Git retain normal behavior', async () => {
    git(new Error('no index entry'));
    assert.equal((await newline.getSaveEdits(document('last'))).length, 1);
    extension = undefined;
    assert.equal((await newline.getSaveEdits(document('last'))).length, 1);
});

test('disabled option avoids Git and manual checks still work', async () => {
    git('last');
    enabled = false;
    extension.exports.getAPI = () => { throw new Error('must not call Git'); };
    assert.equal((await newline.getSaveEdits(document('last'))).length, 1);
    git('last');
    let called = false;
    newline.checkNewLine(document('last'), () => { called = true; });
    assert.equal(called, true);
});

test('waitUntil is registered synchronously and stale edits are discarded', async () => {
    git('original');
    let resolve;
    const repository = { rootUri: { fsPath: path.resolve('fixture') },
        show: () => new Promise(r => { resolve = r; }) };
    extension.exports.getAPI = () => ({ repositories: [repository] });
    const doc = document('changed');
    let pending;
    saveListener({ document: doc, waitUntil: value => { pending = value; } });
    assert.ok(pending instanceof Promise);
    doc.version++;
    resolve('original');
    assert.deepEqual(await pending, []);
});

test('slow Git does not block saves indefinitely', async () => {
    git('last');
    extension.exports.getAPI = () => ({ repositories: [{
        rootUri: { fsPath: path.resolve('fixture') }, show: () => new Promise(() => {})
    }] });
    assert.equal((await newline.getSaveEdits(document('last'))).length, 1);
});

test('nested repositories use the closest root; adjacent directories are excluded', async () => {
    git('last');
    const showUnexpected = async () => { assert.fail('wrong repository'); };
    extension.exports.getAPI = () => ({ repositories: [
        { rootUri: { fsPath: path.resolve('.') }, show: showUnexpected },
        { rootUri: { fsPath: path.resolve('fixture-other') }, show: showUnexpected },
        { rootUri: { fsPath: path.resolve('fixture') }, show: async () => 'last' }
    ] });
    assert.deepEqual(await newline.getSaveEdits(document('last')), []);
    extension.exports.getAPI = () => ({ repositories: [
        { rootUri: { fsPath: path.resolve('fixture-other') }, show: showUnexpected }
    ] });
    assert.equal((await newline.getSaveEdits(document('last'))).length, 1);
});

test('activates Git on demand and skips non-file documents', async () => {
    git('last');
    const api = extension.exports;
    extension = { isActive: false, activate: async () => api };
    assert.deepEqual(await newline.getSaveEdits(document('last')), []);
    const doc = document('last');
    doc.uri.scheme = 'vscode-userdata';
    assert.equal((await newline.getSaveEdits(doc)).length, 1);
});

test('existing newline cleanup produces correct LF and CRLF edits', async () => {
    enabled = false;
    for (const eol of ['\n', '\r\n']) {
        const edits = await newline.getSaveEdits(document(`first${eol}last${eol}${eol}`));
        assert.equal(edits.length, 1);
        assert.equal(edits[0].newText, '');
        assert.deepEqual(edits[0].range.start, new Position(2, 0));
        assert.deepEqual(edits[0].range.end, new Position(3, 0));
    }
    assert.deepEqual(await newline.getSaveEdits(document('')), []);
    assert.deepEqual(await newline.getSaveEdits(document('\n\n')), []);
});

test('tail edits preserve empty, whitespace and newline-only file behavior', async () => {
    enabled = false;
    try {
        for (const eol of ['\n', '\r\n']) {
            for (const ignore of [true, false]) {
                ignoreOnlyNewlines = ignore;
                for (const [input, expected] of [
                    ['', ''],
                    [eol, ignore ? eol : ''],
                    [eol.repeat(3), ignore ? eol.repeat(3) : ''],
                    ['hello', `hello${eol}`],
                    [`hello${eol}`, `hello${eol}`],
                    [`hello${eol.repeat(3)}`, `hello${eol}`],
                    [`hello${eol} \t`, `hello${eol} \t${eol}`],
                    [`hello${eol} \t${eol.repeat(2)}`, `hello${eol} \t${eol}`]
                ]) {
                    const doc = document(input);
                    doc.eol = eol === '\n' ? 1 : 2;
                    const edits = await newline.getSaveEdits(doc);
                    assert.ok(edits.length <= 1);
                    let actual = input;
                    if (edits.length) {
                        const lines = input.split(eol);
                        const offset = pos => {
                            assert.ok(pos.line >= 0 && pos.line < lines.length);
                            assert.ok(pos.character >= 0 && pos.character <= lines[pos.line].length);
                            return lines.slice(0, pos.line).reduce((n, line) => n + line.length + eol.length, 0)
                                + pos.character;
                        };
                        const edit = edits[0];
                        actual = input.slice(0, offset(edit.range.start)) + edit.newText
                            + input.slice(offset(edit.range.end));
                    }
                    assert.equal(actual, expected);
                }
            }
        }
    } finally {
        ignoreOnlyNewlines = true;
    }
});

test('Git tail comparison handles mixed EOLs, lone CR, newline-only and long lines', async () => {
    const longLine = 'x'.repeat(100000);
    try {
        ignoreOnlyNewlines = false;
        for (const [original, current, unchanged] of [
            ['body\r\nlast\n\r\n', 'edited\nlast\n\n', true],
            ['body\nlast\r', 'edited\nlast\r', true],
            ['body\nlast\r', 'edited\nlast', false],
            ['\r\n\n\r\n', '\n\n\n', true],
            ['\r\n\n', '\n\n\n', false],
            ['', '\n\n', false],
            [`body\n${longLine}`, `edited\n${longLine}`, true],
            [`body\n${longLine}`, `edited\n${longLine}y`, false]
        ]) {
            git(original);
            assert.equal((await newline.getSaveEdits(document(current))).length, unchanged ? 0 : 1);
        }
    } finally {
        ignoreOnlyNewlines = true;
    }
});

test('ordinary and Git saves visit only the tail regardless of body line count', async () => {
    for (const useGit of [false, true]) {
        const counts = [];
        for (const bodyLines of [10, 1000000]) {
            git('old body\nlast\n\n');
            enabled = useGit;
            const doc = document('last\n\n');
            let calls = 0;
            doc.lineCount = bodyLines + 3;
            doc.lineAt = line => {
                calls++;
                assert.ok(line >= bodyLines, 'must not visit body lines');
                return { text: line === bodyLines ? 'last' : '' };
            };
            assert.equal((await newline.getSaveEdits(doc)).length, useGit ? 0 : 1);
            counts.push(calls);
        }
        assert.equal(counts[0], counts[1]);
        assert.ok(counts[0] <= 6);
    }
});
