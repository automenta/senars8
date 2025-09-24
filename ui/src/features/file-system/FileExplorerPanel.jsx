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

    const [directoryCache, setDirectoryCache] = useState(new Map());
    
    const fetchDirectoryContents = useCallback((path) => {
        // Check if we already have this directory in cache
        if (directoryCache.has(path)) {
            const cached = directoryCache.get(path);
            if (path === currentPath) {
                setEntries({files: cached.files, directories: cached.directories});
            }
        } else {
            sendMessage('readDirectory', {directoryPath: path});
        }
    }, [sendMessage, directoryCache, currentPath]);

    useEffect(() => {
        fetchDirectoryContents(currentPath);
    }, [fetchDirectoryContents, currentPath]);

    useEffect(() => {
        if (lastMessage) {
            const message = JSON.parse(lastMessage.data);
            if (message.type === 'readDirectoryResponse') {
                // Cache the directory contents
                const dirPath = message.payload.directoryPath;
                setDirectoryCache(prev => new Map(prev).set(dirPath, {
                    files: message.payload.files,
                    directories: message.payload.directories
                }));
                
                // Update entries if this is the current path
                if (dirPath === currentPath) {
                    setEntries({files: message.payload.files, directories: message.payload.directories});
                }
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
                                    <SubDirectoryContent 
                                        parentPath={dirPath} 
                                        directoryCache={directoryCache}
                                        sendMessage={sendMessage}
                                        onFileClick={handleFileClick}
                                        onContextMenu={handleContextMenu}
                                        expandedDirs={expandedDirs}
                                        toggleDirectory={toggleDirectory}
                                        getFileIcon={getFileIcon}
                                    />
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

// Subcomponent to render nested directory content
const SubDirectoryContent = ({ 
    parentPath, 
    directoryCache, 
    sendMessage,
    onFileClick,
    onContextMenu,
    expandedDirs,
    toggleDirectory,
    getFileIcon
}) => {
    const [subEntries, setSubEntries] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        // Only load if directory is expanded and we don't have it cached
        if (expandedDirs.has(parentPath)) {
            if (directoryCache.has(parentPath)) {
                setSubEntries(directoryCache.get(parentPath));
            } else {
                // Fetch directory contents if not in cache
                if (!isLoading) {
                    setIsLoading(true);
                    sendMessage('readDirectory', { directoryPath: parentPath });
                }
            }
        }
    }, [parentPath, expandedDirs, directoryCache, sendMessage, isLoading]);

    // Listen for directory responses to update subentries
    useEffect(() => {
        // This useEffect would need to be implemented in a real scenario
        // where we can listen for specific responses for a given path
    }, []);
    
    // If we don't have entries yet but directory is expanded, show loading
    if (expandedDirs.has(parentPath) && !subEntries && !directoryCache.has(parentPath)) {
        return (
            <ul className="nested-list">
                <li className="placeholder-item">Loading...</li>
            </ul>
        );
    }
    
    if (!subEntries) {
        return null;
    }

    return (
        <ul className="nested-list">
            {subEntries.directories.map(dir => {
                const dirPath = pathUtils.join(parentPath, dir);
                const isExpanded = expandedDirs.has(dirPath);
                
                return (
                    <li key={dir} className="explorer-item directory-item">
                        <div 
                            className="item-row"
                            onContextMenu={(e) => onContextMenu(e, dirPath, 'directory')}
                        >
                            <button 
                                className="toggle-button"
                                onClick={() => toggleDirectory(dirPath)}
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <span 
                                className="directory-name"
                                onClick={() => {
                                    // If we're navigating into this directory, we should update the main view
                                    // For now, just expand it
                                }}
                            >
                                {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />} {dir}
                            </span>
                            <button 
                                className="context-menu-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onContextMenu(e, dirPath, 'directory');
                                }}
                            >
                                <MoreVertical size={14} />
                            </button>
                        </div>
                        
                        {isExpanded && (
                            <SubDirectoryContent
                                parentPath={dirPath}
                                directoryCache={directoryCache}
                                sendMessage={sendMessage}
                                onFileClick={onFileClick}
                                onContextMenu={onContextMenu}
                                expandedDirs={expandedDirs}
                                toggleDirectory={toggleDirectory}
                                getFileIcon={getFileIcon}
                            />
                        )}
                    </li>
                );
            })}
            
            {subEntries.files.map(file => {
                const filePath = pathUtils.join(parentPath, file);
                return (
                    <li key={file} className="explorer-item file-item sub-item">
                        <div 
                            className="item-row"
                            onClick={() => onFileClick(file)}
                            onContextMenu={(e) => onContextMenu(e, filePath, 'file')}
                        >
                            <span className="spacer"></span>
                            <span className="file-name">
                                {getFileIcon(file)} {file}
                            </span>
                            <button 
                                className="context-menu-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onContextMenu(e, filePath, 'file');
                                }}
                            >
                                <MoreVertical size={14} />
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

export default FileExplorerPanel;