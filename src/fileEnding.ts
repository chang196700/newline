import * as vscode from 'vscode';

export interface FileEnding {
    content: string;
    trailingNewlines: number;
}

export interface DocumentEnding extends FileEnding {
    // -1 means the document has no non-empty line.
    contentLine: number;
}

export function documentEnding(doc: vscode.TextDocument): DocumentEnding {
    for (let line = doc.lineCount - 1; line >= 0; line--) {
        const content = doc.lineAt(line).text;
        if (content.length > 0) {
            return { content, contentLine: line, trailingNewlines: doc.lineCount - 1 - line };
        }
    }
    return { content: '', contentLine: -1, trailingNewlines: doc.lineCount - 1 };
}

export function textEnding(text: string): FileEnding {
    let end = text.length;
    let trailingNewlines = 0;
    while (end > 0 && text[end - 1] === '\n') {
        end--;
        if (end > 0 && text[end - 1] === '\r') {end--;}
        trailingNewlines++;
    }
    let start = end;
    while (start > 0 && text[start - 1] !== '\n') {start--;}
    return { content: text.slice(start, end), trailingNewlines };
}
