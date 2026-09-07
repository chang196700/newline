import * as vscode from 'vscode';
import * as path from 'path';
import { hasUnchangedTrackedEnding } from './sourceControl';
import { documentEnding } from './fileEnding';

declare type FileRegex = {
    type: string,
    regex: string
};

export class NewLine {
	onWillSaveTextDocumentDisposable: vscode.Disposable;
	private readonly warnedInvalidRegexes = new Set<string>();

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
		const ending = documentEnding(doc);
		const eolStr = doc.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
		if (ending.contentLine === -1) {
			if (ending.trailingNewlines === 0 || this.getIgnoreOnlyNewlinesFile()) {return;}
			executor(new vscode.Position(0, 0), new vscode.Position(doc.lineCount - 1, 0), '');
		} else if (ending.trailingNewlines === 0) {
			const end = new vscode.Position(ending.contentLine, ending.content.length);
			executor(end, end, eolStr);
		} else if (ending.trailingNewlines > 1) {
			executor(new vscode.Position(ending.contentLine + 1, 0),
				new vscode.Position(doc.lineCount - 1, 0), '');
		}
	}

	checkFileExtNeedIgnore (doc: vscode.TextDocument) {
        const extIgnored = this.getFileExtensionsToIgnore().find(p => doc.fileName.endsWith(p)) !== undefined;
        if (extIgnored) {return true;};
        const regexIgnored = this.getFileRegexToIgnore().find(p => {
            let reg: RegExp;
            try {
                reg = new RegExp(p.regex);
            } catch {
                // Invalid user patterns must not interrupt the save listener.
                if (!this.warnedInvalidRegexes.has(p.regex)) {
                    this.warnedInvalidRegexes.add(p.regex);
                    void vscode.window.showWarningMessage(
                        `NewLine: Invalid regular expression ${JSON.stringify(p.regex)} in newline.fileRegexToIgnore. This rule is skipped; please correct it in Settings.`
                    );
                }
                return false;
            }
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
