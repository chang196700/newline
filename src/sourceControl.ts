import * as path from 'path';
import * as vscode from 'vscode';

// Minimal subset of the built-in Git extension's version 1 API.
interface GitRepository {
    rootUri: vscode.Uri;
    show(ref: string, filePath: string): Promise<string>;
}

interface GitExtension {
    getAPI(version: 1): { repositories: GitRepository[] };
}

function fileEnding(text: string): string {
    // Git may store LF while the editor uses CRLF (core.autocrlf).
    const normalized = text.replace(/\r\n/g, '\n');
    const contentEnd = normalized.replace(/\n+$/, '').length;
    if (contentEnd === 0) {return normalized;}
    return normalized.slice(normalized.lastIndexOf('\n', contentEnd - 1) + 1);
}

export async function hasUnchangedTrackedEnding(doc: vscode.TextDocument): Promise<boolean> {
    if (doc.isUntitled || doc.uri.scheme !== 'file') {return false;}
    try {
        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!extension) {return false;}
        const git = extension.isActive ? extension.exports : await extension.activate();
        const repository = git.getAPI(1).repositories
            .filter(repo => {
                const relative = path.relative(repo.rootUri.fsPath, doc.uri.fsPath);
                return relative !== '' && relative !== '..'
                    && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
            })
            .sort((a, b) => b.rootUri.fsPath.length - a.rootUri.fsPath.length)[0];
        if (!repository) {return false;}
        // An empty ref reads the index. Untracked files have no index entry.
        const original = await repository.show('', doc.uri.fsPath);
        return fileEnding(original) === fileEnding(doc.getText());
    } catch {
        // Missing index entries, disabled Git and repository errors fall back
        // to the existing newline behavior without preventing the save.
        return false;
    }
}
