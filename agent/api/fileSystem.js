import fs from 'fs/promises';
import path, {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import {executeFileOperation} from '../utils/asyncWrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..', '..', '..'); // Project root directory

export const handleReadDirectory = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {directoryPath} = payload;
        const absolutePath = path.join(ROOT_DIR, directoryPath);
        const entries = await fs.readdir(absolutePath, {withFileTypes: true});
        const files = entries
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
        const directories = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        ws.send(JSON.stringify({type: 'readDirectoryResponse', payload: {files, directories, directoryPath}}));
    }, ws, 'read directory');
};

export const handleReadFile = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {filePath} = payload;
        const absolutePath = path.join(ROOT_DIR, filePath);
        const content = await fs.readFile(absolutePath, 'utf8');
        ws.send(JSON.stringify({type: 'readFileResponse', payload: {filePath, content}}));
    }, ws, 'read file');
};

export const handleWriteFile = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {filePath, content} = payload;
        const absolutePath = path.join(ROOT_DIR, filePath);
        await fs.writeFile(absolutePath, content, 'utf8');
        ws.send(JSON.stringify({type: 'writeFileResponse', payload: {filePath, success: true}}));
    }, ws, 'write file');
};

export const handleCreateFile = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {filePath} = payload;
        const absolutePath = path.join(ROOT_DIR, filePath);
        await fs.writeFile(absolutePath, '', 'utf8'); // Create empty file
        ws.send(JSON.stringify({type: 'createFileResponse', payload: {filePath, success: true}}));
    }, ws, 'create file');
};

export const handleCreateDirectory = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {directoryPath} = payload;
        const absolutePath = path.join(ROOT_DIR, directoryPath);
        await fs.mkdir(absolutePath, {recursive: true});
        ws.send(JSON.stringify({type: 'createDirectoryResponse', payload: {directoryPath, success: true}}));
    }, ws, 'create directory');
};

export const handleDeletePath = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {path: pathToDelete} = payload;
        const absolutePath = path.join(ROOT_DIR, pathToDelete);
        await fs.rm(absolutePath, {recursive: true, force: true});
        ws.send(JSON.stringify({type: 'deletePathResponse', payload: {path: pathToDelete, success: true}}));
    }, ws, 'delete path');
};

export const handleRenamePath = async (payload, ws) => {
    return executeFileOperation(async () => {
        const {oldPath, newPath} = payload;
        const absoluteOldPath = path.join(ROOT_DIR, oldPath);
        const absoluteNewPath = path.join(ROOT_DIR, newPath);
        await fs.rename(absoluteOldPath, absoluteNewPath);
        ws.send(JSON.stringify({type: 'renamePathResponse', payload: {oldPath, newPath, success: true}}));
    }, ws, 'rename path');
};