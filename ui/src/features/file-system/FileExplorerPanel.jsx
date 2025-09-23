import React, {useState, useEffect, useCallback} from 'react';
import {useConnection} from '@/context/ConnectionProvider';
import {useSharedState} from '@/context/SharedStateProvider';

const FileExplorerPanel = () => {
    const {sendMessage, lastMessage} = useConnection();
    const {setSharedState} = useSharedState();
    const [currentPath, setCurrentPath] = useState('.');
    const [entries, setEntries] = useState({files: [], directories: []});

    const fetchDirectoryContents = useCallback((path) => {
        sendMessage('readDirectory', {directoryPath: path});
    }, [sendMessage]);

    useEffect(() => {
        fetchDirectoryContents(currentPath);
    }, [fetchDirectoryContents, currentPath]);

    useEffect(() => {
        if (lastMessage) {
            const message = JSON.parse(lastMessage.data);
            if (message.type === 'readDirectoryResponse' && message.payload.directoryPath === currentPath) {
                setEntries({files: message.payload.files, directories: message.payload.directories});
            } else if (message.type === 'readFileResponse') {
                setSharedState(prevState => ({
                    ...prevState,
                    editorContent: message.payload.content,
                    currentOpenFile: message.payload.filePath,
                }));
            }
        }
    }, [lastMessage, currentPath, setSharedState]);

    const handleDirectoryClick = (directory) => {
        const newPath = path.join(currentPath, directory);
        setCurrentPath(newPath);
    };

    const handleFileClick = (file) => {
        const filePath = path.join(currentPath, file);
        sendMessage('readFile', {filePath});
    };

    const handleGoBack = () => {
        const parentPath = path.dirname(currentPath);
        if (parentPath !== currentPath) { // Prevent going above root
            setCurrentPath(parentPath);
        }
    };

    const handleCreateFile = () => {
        const fileName = prompt('Enter new file name:');
        if (fileName) {
            const filePath = path.join(currentPath, fileName);
            sendMessage('createFile', {filePath});
            fetchDirectoryContents(currentPath); // Refresh list
        }
    };

    const handleCreateDirectory = () => {
        const dirName = prompt('Enter new folder name:');
        if (dirName) {
            const directoryPath = path.join(currentPath, dirName);
            sendMessage('createDirectory', {directoryPath});
            fetchDirectoryContents(currentPath); // Refresh list
        }
    };

    const handleDelete = (itemPath) => {
        if (confirm(`Are you sure you want to delete ${itemPath}?`)) {
            sendMessage('deletePath', {path: itemPath});
            fetchDirectoryContents(currentPath); // Refresh list
        }
    };

    const handleRename = (oldItemPath, oldName) => {
        const newName = prompt(`Rename ${oldName} to:`, oldName);
        if (newName && newName !== oldName) {
            const newItemPath = path.join(path.dirname(oldItemPath), newName);
            sendMessage('renamePath', {oldPath: oldItemPath, newPath: newItemPath});
            fetchDirectoryContents(currentPath); // Refresh list
        }
    };

    // Helper to join paths, handling '.' correctly
    const path = {
        join: (...args) => {
            const resolvedPath = args.reduce((acc, part) => {
                if (acc === '.') return part;
                if (part === '.') return acc;
                return `${acc}/${part}`;
            }, '.');
            return resolvedPath.replace(/\/\.\//g, '/').replace(/\/\.$/, '');
        },
        dirname: (p) => {
            if (p === '.') return '.';
            const parts = p.split('/');
            if (parts.length === 1) return '.';
            return parts.slice(0, -1).join('/') || '.';
        }
    };

    return (
        <div style={{padding: '10px', overflow: 'auto', height: '100%'}}>
            <h3>File Explorer</h3>
            <p>Current Path: {currentPath}</p>
            {currentPath !== '.' && (
                <button onClick={handleGoBack}>.. (Back)</button>
            )}
            <div style={{marginTop: '10px'}}>
                <button onClick={handleCreateFile}>New File</button>
                <button onClick={handleCreateDirectory} style={{marginLeft: '5px'}}>New Folder</button>
            </div>
            <ul>
                {entries.directories.map(dir => (
                    <li key={dir} style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                        <span onClick={() => handleDirectoryClick(dir)}>📁 {dir}</span>
                        <button onClick={() => handleDelete(path.join(currentPath, dir))} style={{marginLeft: '10px', fontSize: '0.7em'}}>Delete</button>
                        <button onClick={() => handleRename(path.join(currentPath, dir), dir)} style={{marginLeft: '5px', fontSize: '0.7em'}}>Rename</button>
                    </li>
                ))}
                {entries.files.map(file => (
                    <li key={file} style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                        <span onClick={() => handleFileClick(file)}>📄 {file}</span>
                        <button onClick={() => handleDelete(path.join(currentPath, file))} style={{marginLeft: '10px', fontSize: '0.7em'}}>Delete</button>
                        <button onClick={() => handleRename(path.join(currentPath, file), file)} style={{marginLeft: '5px', fontSize: '0.7em'}}>Rename</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FileExplorerPanel;