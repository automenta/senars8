import React, {useState, useEffect} from 'react';
import AceEditor from 'react-ace';
import {useSharedState} from '@/context/SharedStateProvider';
import {useConnection} from '@/context/ConnectionProvider';

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
    const extension = filename.split('.').pop();
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
        default:
            return 'text';
    }
};

const CodeEditorPanel = () => {
    const {sharedState, setSharedState} = useSharedState();
    const {sendMessage} = useConnection();
    const [code, setCode] = useState(sharedState.editorContent || '// Start coding here...');
    const [currentFile, setCurrentFile] = useState(sharedState.currentOpenFile || null);

    useEffect(() => {
        if (sharedState.editorContent !== undefined) {
            setCode(sharedState.editorContent);
        }
        if (sharedState.currentOpenFile !== undefined) {
            setCurrentFile(sharedState.currentOpenFile);
        }
    }, [sharedState.editorContent, sharedState.currentOpenFile]);

    const onChange = (newValue) => {
        setCode(newValue);
        // Optionally, save to shared state for immediate reflection
        setSharedState(prevState => ({...prevState, editorContent: newValue}));
    };

    const handleSave = () => {
        if (currentFile) {
            sendMessage('writeFile', {filePath: currentFile, content: code});
            alert(`File ${currentFile} saved!`); // Basic feedback
        } else {
            alert('No file open to save.');
        }
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div style={{padding: '5px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between'}}>
                <span>{currentFile ? `Editing: ${currentFile}` : 'No file open'}</span>
                <button onClick={handleSave} disabled={!currentFile}>Save</button>
            </div>
            <AceEditor
                mode={getMode(currentFile)}
                theme="monokai"
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
                }}
                style={{width: '100%', flexGrow: 1}}
            />
        </div>
    );
};

export default CodeEditorPanel;
