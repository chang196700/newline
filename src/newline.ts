import * as vscode from 'vscode';
import * as path from 'path';
import { hasUnchangedTrackedEnding } from './sourceControl';

declare type FileRegex = {
    type: string,
    regex: string
};

export class NewLine {
	onWillSaveTextDocumentDisposable: vscode.Disposable;

	constructor () {
		this.onWillSaveTextDocumentDisposable = vscode.workspace.onWillSaveTextDocument((e) => {
			const doc = e.document;
			if (this.checkFileExtNeedIgnore(doc)) {return;}
			// waitUntil must be called during event dispatch, before awaiting Git.
			e.waitUntil(this.getSaveEdits(doc));
		}, null);
	}

	async getSaveEdits(doc: vscode.TextDocument): Promise<vscode.TextEdit[]> {
		const edits: vscode.TextEdit[] = [];
		this.checkNewLine(doc, (start, end, replace) => {
			edits.push(new vscode.TextEdit(new vscode.Range(start, end), replace));
		});
		if (edits.length === 0 || !vscode.workspace.getConfiguration('newline', doc.uri)
			.get<boolean>('ignoreSourceControlledFiles', false)) {return edits;}
		const version = doc.version;
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			// Stay below VS Code's shared save-participant time budget.
			const ignore = await Promise.race([
				hasUnchangedTrackedEnding(doc),
				new Promise<boolean>(resolve => {timer = setTimeout(() => resolve(false), 500);})
			]);
			return ignore || doc.isClosed || doc.version !== version ? [] : edits;
		} finally {
			if (timer !== undefined) {clearTimeout(timer);}
		}
	}

	checkNewLine (doc: vscode.TextDocument, executor: (start: vscode.Position, end: vscode.Position, replace: string) => void) {
		if (doc.isUntitled) {
			return;
		}
		const text = doc.getText();
		if (text.length === 0) {
			return;
		}
		const eolStr = doc.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
		const removeEOLPatter = `(${eolStr})+$`;
		const textLength = text.length;
		const textWithoutEolLength = text.replace(new RegExp(removeEOLPatter), '').length;
		const eolCounts = (textLength - textWithoutEolLength) / eolStr.length;
		const lineCount = doc.lineCount;

		if (textWithoutEolLength === 0 && this.getIgnoreOnlyNewlinesFile()) {return;}

		if (textWithoutEolLength === 0 || eolCounts === 0 || eolCounts > 1) {
			let start: vscode.Position;
			let end: vscode.Position;
			let replace: string;
			start = new vscode.Position(lineCount - 1, doc.lineAt(lineCount - 1).text.length);
			end = new vscode.Position(lineCount - 1, doc.lineAt(lineCount - 1).text.length);
			replace = eolStr;
			if (textWithoutEolLength === 0) {
				start = new vscode.Position(0, doc.lineAt(0).text.length);
				replace = '';
			} else if (eolCounts > 1) {
				start = new vscode.Position(lineCount - eolCounts, doc.lineAt(lineCount - eolCounts).text.length);
				replace = '';
			}
			executor(start, end, replace);
		}
	}

	checkFileExtNeedIgnore (doc: vscode.TextDocument) {
        const extIgnored = this.getFileExtensionsToIgnore().find(p => doc.fileName.endsWith(p)) !== undefined;
        if (extIgnored) {return true;};
        const regexIgnored = this.getFileRegexToIgnore().find(p => {
            let reg = new RegExp(p.regex);
            return p.type === "basename"
                ? reg.test(path.basename(doc.fileName))
                : reg.test(doc.fileName);
        }) !== undefined;
        if (regexIgnored) {return true;}
        return false;
	}

	getNewlineConfiguration (): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('newline');
	}

	getFileExtensionsToIgnore (): Array<string> {
		return this.getNewlineConfiguration().get<Array<string>>('fileExtensionsToIgnore', new Array<string>());
    }

    getFileRegexToIgnore (): Array<FileRegex> {
        return this.getNewlineConfiguration().get<Array<FileRegex>>('fileRegexToIgnore', new Array<FileRegex>());
    }

	getIgnoreOnlyNewlinesFile (): boolean {
		return this.getNewlineConfiguration().get<boolean>('ignoreOnlyNewlinesFile', true);
	}

	dispose () {
		this.onWillSaveTextDocumentDisposable.dispose();
	}
}
