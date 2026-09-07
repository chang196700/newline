// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NewLine } from './newline';

// Activate at startup so save listeners do not depend on a save command being run.
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let newline = new NewLine();
	let disposable = vscode.commands.registerCommand('newline.checkNewline', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {return;}
		newline.checkNewLine(editor.document, (start, end, replace) => {
			editor.edit((editBuilder) => {
				editBuilder.replace(new vscode.Range(start, end), replace);
			});
		});
	});

	context.subscriptions.push(newline);
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
