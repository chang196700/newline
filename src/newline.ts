import * as vscode from 'vscode';
import * as path from 'path';

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
			this.checkNewLine(doc, (start, end, replace) => {
				e.waitUntil(new Promise((resolve, reject) => {
					const range = new vscode.Range(start, end);
					const edit = new vscode.TextEdit(range, replace);
					resolve([ edit ]);
				}));
			});
		}, null);
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
