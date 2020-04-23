// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "newline" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let newline = new NewLine();
	let disposable = vscode.commands.registerCommand('newline.checkNewline', () => {
		let editor = vscode.window.activeTextEditor;
		if (editor === null) {return;}
		newline.checkNewLine(editor!.document, (start, end, replace) => {
			editor?.edit((editBuilder) => {
				editBuilder.replace(new vscode.Range(start, end), replace);
			});
		});
	});

	context.subscriptions.push(newline);
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

class NewLine {
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
		return extIgnored;
	}

	getNewlineConfiguration (): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('newline');
	}

	getFileExtensionsToIgnore (): Array<string> {
		return this.getNewlineConfiguration().get<Array<string>>('fileExtensionsToIgnore', new Array<string>());
	}

	getIgnoreOnlyNewlinesFile (): boolean {
		return this.getNewlineConfiguration().get<boolean>('ignoreOnlyNewlinesFile', true);
	}

	dispose () {
		this.onWillSaveTextDocumentDisposable.dispose();
	}
}
