import React, {useState, useEffect, useCallback} from 'react';
import {useConnection} from '@/context/useConnection';
import {useSharedState} from '@/context/useSharedState';
import {Folder, File, FolderOpen, ChevronRight, ChevronDown, Plus, MoreVertical} from 'lucide-react';
import './FileExplorerPanel.css';

// Path utility functions since we don't have node:path in the browser
const pathUtils = {
    join: (...args) => {
        const resolvedPath = args.reduce((acc, part) => {
            if (acc === '.') return part;
            if (part === '.') return acc;
            return `${acc}/${part}`;
        }, '.');
        return resolvedPath.replace(/\/\.\//g, '/').replace(/\/\.$/, '') || '.';
    },
    dirname: (p) => {
        if (p === '.') return '.';
        const parts = p.split('/');
        if (parts.length === 1) return '.';
        return parts.slice(0, -1).join('/') || '.';
    }
};

const FileExplorerPanel = () => {
    const {sendMessage, lastMessage} = useConnection();
    const {setSharedState} = useSharedState();
    const [currentPath, setCurrentPath] = useState('.');
    const [entries, setEntries] = useState({files: [], directories: []});
    const [expandedDirs, setExpandedDirs] = useState(new Set(['.'])); // Root is expanded by default
    const [contextMenu, setContextMenu] = useState({show: false, x: 0, y: 0, path: '', type: ''});

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
        const newPath = pathUtils.join(currentPath, directory);
        setCurrentPath(newPath);
        // Expand the clicked directory
        setExpandedDirs(prev => new Set(prev).add(newPath));
    };

    const handleFileClick = (file) => {
        const filePath = pathUtils.join(currentPath, file);
        sendMessage('readFile', {filePath});
    };

    const handleGoBack = () => {
        const parentPath = pathUtils.dirname(currentPath);
        if (parentPath !== currentPath) { // Prevent going above root
            setCurrentPath(parentPath);
        }
    };

    const handleCreateFile = () => {
        const fileName = prompt('Enter new file name:');
        if (fileName) {
            const filePath = pathUtils.join(currentPath, fileName);
            sendMessage('createFile', {filePath});
            fetchDirectoryContents(currentPath); // Refresh list
        }
    };

    const handleCreateDirectory = () => {
        const dirName = prompt('Enter new folder name:');
        if (dirName) {
            const directoryPath = pathUtils.join(currentPath, dirName);
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
            const newItemPath = pathUtils.join(pathUtils.dirname(oldItemPath), newName);
            sendMessage('renamePath', {oldPath: oldItemPath, newPath: newItemPath});
            fetchDirectoryContents(currentPath); // Refresh list
        }
    };

    const toggleDirectory = (dirPath) => {
        setExpandedDirs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dirPath)) {
                newSet.delete(dirPath);
            } else {
                newSet.add(dirPath);
            }
            return newSet;
        });
    };

    const handleContextMenu = (e, itemPath, type) => {
        e.preventDefault();
        setContextMenu({
            show: true,
            x: e.clientX,
            y: e.clientY,
            path: itemPath,
            type
        });
    };

    const closeContextMenu = () => {
        setContextMenu({show: false, x: 0, y: 0, path: '', type: ''});
    };

    const getFileIcon = (filename) => {
        if (!filename) return <File size={16} />;
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                return <File size={16} />;
            case 'json':
                return <File size={16} />;
            case 'css':
                return <File size={16} />;
            case 'html':
                return <File size={16} />;
            case 'py':
                return <File size={16} />;
            case 'nars':
            case 'narsese':
                return <File size={16} color="#ff6b6b" />;
            default:
                return <File size={16} />;
        }
    };

    return (
        <div className="file-explorer-panel">
            <div className="explorer-header">
                <h3>File Explorer</h3>
                <div className="explorer-actions">
                    <button onClick={handleCreateFile} title="New File" className="action-button">
                        <Plus size={14} /> New File
                    </button>
                    <button onClick={handleCreateDirectory} title="New Directory" className="action-button">
                        <Folder size={14} /> New Folder
                    </button>
                </div>
            </div>
            
            <div className="current-path">
                <span>Current Path: {currentPath}</span>
                {currentPath !== '.' && (
                    <button onClick={handleGoBack} className="back-button">.. (Back)</button>
                )}
            </div>
            
            <div className="explorer-content">
                <ul className="explorer-list">
                    {entries.directories.map(dir => {
                        const dirPath = pathUtils.join(currentPath, dir);
                        const isExpanded = expandedDirs.has(dirPath);
                        
                        return (
                            <li key={dir} className="explorer-item directory-item">
                                <div 
                                    className="item-row"
                                    onContextMenu={(e) => handleContextMenu(e, dirPath, 'directory')}
                                >
                                    <button 
                                        className="toggle-button"
                                        onClick={() => toggleDirectory(dirPath)}
                                    >
                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                    <span 
                                        className="directory-name"
                                        onClick={() => handleDirectoryClick(dir)}
                                    >
                                        {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />} {dir}
                                    </span>
                                    <button 
                                        className="context-menu-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleContextMenu(e, dirPath, 'directory');
                                        }}
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                </div>
                                
                                {isExpanded && (
                                    <ul className="nested-list">
                                        {/* This would be populated with subdirectory contents */}
                                        <li className="placeholder-item">Loading...</li>
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                    
                    {entries.files.map(file => {
                        const filePath = pathUtils.join(currentPath, file);
                        return (
                            <li key={file} className="explorer-item file-item">
                                <div 
                                    className="item-row"
                                    onClick={() => handleFileClick(file)}
                                    onContextMenu={(e) => handleContextMenu(e, filePath, 'file')}
                                >
                                    <span className="spacer"></span>
                                    <span className="file-name">
                                        {getFileIcon(file)} {file}
                                    </span>
                                    <button 
                                        className="context-menu-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleContextMenu(e, filePath, 'file');
                                        }}
                                    >
                                        <MoreVertical size={14} />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
            
            {/* Context Menu */}
            {contextMenu.show && (
                <div 
                    className="context-menu"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={closeContextMenu}
                >
                    <button onClick={() => {
                        const fileName = contextMenu.path.split('/').pop();
                        handleRename(contextMenu.path, fileName);
                    }}>
                        Rename
                    </button>
                    <button onClick={() => handleDelete(contextMenu.path)}>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileExplorerPanel;