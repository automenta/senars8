import fs from 'fs/promises';
import path from 'path';
import {serverError} from '../utils/logger.js';

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..'); // Project root directory

export const handleReadDirectory = async (payload, ws) => {
    const {directoryPath} = payload;
    const absolutePath = path.join(ROOT_DIR, directoryPath);
    try {
        const entries = await fs.readdir(absolutePath, {withFileTypes: true});
        const files = entries
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
        const directories = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        ws.send(JSON.stringify({type: 'readDirectoryResponse', payload: {files, directories, directoryPath}}));
    } catch (error) {
        serverError('Failed to read directory:', error);
        ws.send(JSON.stringify({
            type: 'error',
            payload: {message: `Failed to read directory: ${error.message}`}
        }));
    }
};

export const handleReadFile = async (payload, ws) => {
    const {filePath} = payload;
    const absolutePath = path.join(ROOT_DIR, filePath);
    try {
        const content = await fs.readFile(absolutePath, 'utf8');
        ws.send(JSON.stringify({type: 'readFileResponse', payload: {filePath, content}}));
    } catch (error) {
        serverError('Failed to read file:', error);
        ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to read file: ${error.message}`}}));
    }
};

export const handleWriteFile = async (payload, ws) => {
    const {filePath, content} = payload;
    const absolutePath = path.join(ROOT_DIR, filePath);
    try {
        await fs.writeFile(absolutePath, content, 'utf8');
        ws.send(JSON.stringify({type: 'writeFileResponse', payload: {filePath, success: true}}));
    } catch (error) {
        serverError('Failed to write file:', error);
        ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to write file: ${error.message}`}}));
    }
};

export const handleCreateFile = async (payload, ws) => {
    const {filePath} = payload;
    const absolutePath = path.join(ROOT_DIR, filePath);
    try {
        await fs.writeFile(absolutePath, '', 'utf8'); // Create empty file
        ws.send(JSON.stringify({type: 'createFileResponse', payload: {filePath, success: true}}));
    } catch (error) {
        serverError('Failed to create file:', error);
        ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to create file: ${error.message}`}}));
    }
};

export const handleCreateDirectory = async (payload, ws) => {
    const {directoryPath} = payload;
    const absolutePath = path.join(ROOT_DIR, directoryPath);
    try {
        await fs.mkdir(absolutePath, {recursive: true});
        ws.send(JSON.stringify({type: 'createDirectoryResponse', payload: {directoryPath, success: true}}));
    } catch (error) {
        serverError('Failed to create directory:', error);
        ws.send(JSON.stringify({
            type: 'error',
            payload: {message: `Failed to create directory: ${error.message}`}
        }));
    }
};

export const handleDeletePath = async (payload, ws) => {
    const {path: pathToDelete} = payload;
    const absolutePath = path.join(ROOT_DIR, pathToDelete);
    try {
        await fs.rm(absolutePath, {recursive: true, force: true});
        ws.send(JSON.stringify({type: 'deletePathResponse', payload: {path: pathToDelete, success: true}}));
    } catch (error) {
        serverError('Failed to delete path:', error);
        ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to delete path: ${error.message}`}}));
    }
};

export const handleRenamePath = async (payload, ws) => {
    const {oldPath, newPath} = payload;
    const absoluteOldPath = path.join(ROOT_DIR, oldPath);
    const absoluteNewPath = path.join(ROOT_DIR, newPath);
    try {
        await fs.rename(absoluteOldPath, absoluteNewPath);
        ws.send(JSON.stringify({type: 'renamePathResponse', payload: {oldPath, newPath, success: true}}));
    } catch (error) {
        serverError('Failed to rename path:', error);
        ws.send(JSON.stringify({type: 'error', payload: {message: `Failed to rename path: ${error.message}`}}));
    }
};