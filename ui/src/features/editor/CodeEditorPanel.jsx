import React, {useState, useEffect, useCallback} from 'react';
import AceEditor from 'react-ace';
import {useSharedState} from '@/context/useSharedState';
import {useConnection} from '@/context/useConnection';
import notificationService from '@/services/notificationService';
import log from '@/utils/logger';
import './NarseseMode'; // Import our custom Narsese mode

import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-markdown';



const getMode = (filename) => {
    if (!filename) return 'javascript';
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return 'javascript';
        case 'json':
            return 'json';
        case 'css':
            return 'css';
        case 'html':
        case 'htm':
            return 'html';
        case 'py':
            return 'python';
        case 'xml':
            return 'xml';
        case 'md':
            return 'markdown';
        case 'nars':
        case 'narsese':
            return 'narsese'; // Our custom Narsese mode
        default:
            return 'text';
    }
};

const CodeEditorPanel = () => {
    const {sharedState, setSharedState, updateSharedEditorContent} = useSharedState();
    const {sendMessage} = useConnection();
    const [code, setCode] = useState(sharedState.editorContent || '// Start coding here...');
    const [currentFile, setCurrentFile] = useState(sharedState.currentOpenFile || null);
    const [editorTheme, setEditorTheme] = useState('monokai');
    const [editorMode, setEditorMode] = useState(getMode(currentFile));

    // Update editor mode when file changes
    useEffect(() => {
        setEditorMode(getMode(currentFile));
    }, [currentFile]);

    useEffect(() => {
        if (sharedState.editorContent !== undefined) {
            setCode(sharedState.editorContent);
        }
        if (sharedState.currentOpenFile !== undefined) {
            setCurrentFile(sharedState.currentOpenFile);
        }
    }, [sharedState.editorContent, sharedState.currentOpenFile]);

    const onChange = useCallback((newValue) => {
        setCode(newValue);
        // Update shared document for collaborative editing
        if (updateSharedEditorContent) {
            updateSharedEditorContent(newValue);
        } else {
            setSharedState(prevState => ({...prevState, editorContent: newValue}));
        }
    }, [setSharedState, updateSharedEditorContent]);

    const handleSave = () => {
        if (currentFile) {
            try {
                sendMessage('writeFile', {filePath: currentFile, content: code});
                notificationService.addSuccess('File Saved', `File ${currentFile} has been saved successfully.`);
            } catch (error) {
                log.error('Error saving file:', error);
                notificationService.addError('File Save Error', `Failed to save file ${currentFile}`);
            }
        } else {
            notificationService.addWarning('No File', 'No file open to save.');
        }
    };

    const handleRun = () => {
        if (currentFile && currentFile.endsWith('.nars')) {
            // For Narsese files, send content as Narsese statements
            const lines = code.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('//'));
            lines.forEach(line => {
                if (line.trim().endsWith('.') || line.trim().endsWith('?')) {
                    sendMessage('narsese', line.trim());
                }
            });
        } else {
            // For other files, just save
            handleSave();
        }
    };

    const handleThemeChange = (theme) => {
        setEditorTheme(theme);
    };

    return (
        <div className="code-editor-panel">
            <div className="editor-header">
                <div className="file-info">
                    {currentFile ? `Editing: ${currentFile}` : 'No file open'}
                </div>
                <div className="editor-controls">
                    <select 
                        value={editorTheme} 
                        onChange={(e) => handleThemeChange(e.target.value)}
                        className="theme-selector"
                    >
                        <option value="monokai">Monokai</option>
                        <option value="github">GitHub</option>
                        <option value="solarized_light">Solarized Light</option>
                        <option value="solarized_dark">Solarized Dark</option>
                    </select>
                    <button onClick={handleRun} disabled={!currentFile} className="run-button">
                        Run
                    </button>
                    <button onClick={handleSave} disabled={!currentFile} className="save-button">
                        Save
                    </button>
                </div>
            </div>
            <AceEditor
                mode={editorMode}
                theme={editorTheme}
                onChange={onChange}
                name="CODE_EDITOR"
                editorProps={{$blockScrolling: true}}
                value={code}
                setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    showLineNumbers: true,
                    tabSize: 2,
                    fontSize: 14,
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                }}
                style={{width: '100%', height: 'calc(100% - 50px)'}}
            />
        </div>
    );
};

export default CodeEditorPanel;
