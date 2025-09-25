import React, {useCallback, useState} from 'react';
import {Panel} from '@ui/components';
import agentService from '@/services/agentService';
import notificationService from '@/services/notificationService';
import {useUIErrorHandler} from '@/services/uiErrorHandler';
import {parseTerm} from '@core/parser/parse-utils.js';
import {useConnection} from '@/context/useConnection';
import useReasoningDebugger from '@/hooks/useReasoningDebugger';
import {CheckCircle, Code, Play, RotateCcw, XCircle, Zap} from 'lucide-react';
import './ReasoningDebuggerPanel.css';

function ReasoningDebuggerPanel() {
    const {isConnected} = useConnection();
    const {handleError} = useUIErrorHandler('ReasoningDebuggerPanel');
    const {debugResults, isProcessing: isDebugProcessing, debugReasoning, clearDebugResults} = useReasoningDebugger();
    const [inputStatement, setInputStatement] = useState('');
    const [executionHistory, setExecutionHistory] = useState([]);

    const validateStatement = (statement) => {
        if (!statement.trim()) {
            return 'Statement cannot be empty';
        }

        // Check if it's a valid Narsese statement
        if (!statement.includes('.') && !statement.includes('?') && !statement.includes('!')) {
            return 'Statement must end with . (belief), ? (question), or ! (goal)';
        }

        // Try to parse the term
        try {
            const parsed = parseTerm(statement);
            if (!parsed) {
                return 'Invalid Narsese syntax';
            }
        } catch (e) {
            return `Parsing error: ${e.message}`;
        }

        return null;
    };

    const handleDebugReasoning = useCallback(async () => {
        const validationError = validateStatement(inputStatement);
        if (validationError) {
            notificationService.addError('Validation Error', validationError);
            return;
        }

        try {
            const response = await debugReasoning(inputStatement);

            setExecutionHistory(prev => [...prev, {
                id: Date.now(),
                statement: inputStatement,
                result: response,
                timestamp: new Date().toISOString()
            }]);

            notificationService.addInfo('Success', 'Reasoning debug completed');
        } catch (error) {
            handleError(error, {
                operation: 'debugReasoning',
                statement: inputStatement
            });
        }
    }, [inputStatement, debugReasoning, handleError]);

    const handleExecuteStatement = useCallback(() => {
        if (!isConnected) {
            notificationService.addError('Connection Error', 'Not connected to agent');
            return;
        }

        const validationError = validateStatement(inputStatement);
        if (validationError) {
            notificationService.addError('Validation Error', validationError);
            return;
        }

        // Send to the agent
        agentService.sendNarsese(inputStatement);
        notificationService.addInfo('Statement Sent', `Executed: ${inputStatement}`);

        // Clear input after sending
        setInputStatement('');
    }, [inputStatement, isConnected]);

    const handleClear = useCallback(() => {
        clearDebugResults();
        setInputStatement('');
        setExecutionHistory([]);
    }, [clearDebugResults]);

    const handleExampleSelect = (example) => {
        setInputStatement(example);
    };

    const examples = [
        '<bird --> animal>.',
        '<robin --> bird>?',
        '<robin --> animal>.',
        '(&&, <bird --> animal>, <robin --> bird>)?',
        '<robin --> flyer>.',
        '<animal --> living>.',
    ];

    return (
        <Panel title={<><Zap size={18}/> Reasoning Debugger</>}>
            <div className="reasoning-debugger-panel">
                <div className="debug-input-section">
                    <div className="input-group">
                        <label htmlFor="statement-input">Narsese Statement:</label>
                        <div className="input-controls">
                            <input
                                id="statement-input"
                                type="text"
                                value={inputStatement}
                                onChange={(e) => setInputStatement(e.target.value)}
                                placeholder="Enter Narsese statement (e.g., <bird --> animal>.)"
                                disabled={isProcessing}
                                className="statement-input"
                            />
                            <div className="input-actions">
                                <button
                                    onClick={handleExecuteStatement}
                                    disabled={!isConnected || !inputStatement.trim() || isProcessing}
                                    className="execute-btn"
                                    title="Execute statement in agent"
                                >
                                    <Play size={16}/> Execute
                                </button>
                                <button
                                    onClick={handleDebugReasoning}
                                    disabled={!isConnected || !inputStatement.trim() || isProcessing}
                                    className="debug-btn"
                                    title="Debug reasoning for this statement"
                                >
                                    <Zap size={16}/> Debug
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="examples-section">
                        <label>Examples:</label>
                        <div className="examples-grid">
                            {examples.map((example, index) => (
                                <button
                                    key={index}
                                    className="example-btn"
                                    onClick={() => handleExampleSelect(example)}
                                    title={`Load example: ${example}`}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="controls-section">
                        <button
                            onClick={handleClear}
                            className="clear-btn"
                            title="Clear all results"
                        >
                            <RotateCcw size={16}/> Clear
                        </button>
                    </div>
                </div>

                <div className="debug-results-section">
                    <div className="results-header">
                        <h3>Debug Results</h3>
                    </div>

                    {isDebugProcessing ? (
                        <div className="processing-indicator">
                            <div className="spinner"></div>
                            <span>Processing statement...</span>
                        </div>
                    ) : debugResults ? (
                        <div className="debug-results">
                            <div className="result-section">
                                <h4>Statement Analysis</h4>
                                <div className="result-content">
                                    <div className="analysis-item">
                                        <strong>Original Statement:</strong>
                                        <span className="statement-display">{debugResults.statement}</span>
                                    </div>
                                    {debugResults.parsedTerm && (
                                        <div className="analysis-item">
                                            <strong>Parsed Term:</strong>
                                            <pre
                                                className="parsed-display">{JSON.stringify(debugResults.parsedTerm, null, 2)}</pre>
                                        </div>
                                    )}
                                    {debugResults.task && (
                                        <div className="analysis-item">
                                            <strong>Task Details:</strong>
                                            <div className="task-details">
                                                <div>ID: {debugResults.task.id}</div>
                                                <div>Term Key: {debugResults.task.termKey}</div>
                                                <div>Punctuation: {debugResults.task.punctuation}</div>
                                                <div>Priority: {debugResults.task.priority}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {debugResults.reasoningSteps && debugResults.reasoningSteps.length > 0 && (
                                <div className="result-section">
                                    <h4>Reasoning Steps</h4>
                                    <div className="reasoning-steps">
                                        {debugResults.reasoningSteps.map((step, index) => (
                                            <div key={index} className="reasoning-step">
                                                <div className="step-header">
                                                    <span className="step-type">{step.type}</span>
                                                    <span className="step-index">Step {index + 1}</span>
                                                </div>
                                                <div className="step-content">
                                                    <pre>{JSON.stringify(step.inference, null, 2)}</pre>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {debugResults.newTasks && debugResults.newTasks.length > 0 && (
                                <div className="result-section">
                                    <h4>Newly Generated Tasks</h4>
                                    <div className="tasks-list">
                                        {debugResults.newTasks.map((task, index) => (
                                            <div key={index} className="task-item">
                                                <div className="task-statement">{task.statement}</div>
                                                <div className="task-priority">Priority: {task.priority}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="no-results">
                            <Code size={48} className="no-results-icon"/>
                            <p>Enter a statement to debug reasoning</p>
                        </div>
                    )}
                </div>

                {executionHistory.length > 0 && (
                    <div className="execution-history-section">
                        <div className="history-header">
                            <h4>Execution History</h4>
                        </div>
                        <div className="history-list">
                            {executionHistory.slice(-5).reverse().map((entry) => (
                                <div key={entry.id} className="history-item">
                                    <div className="history-statement">{entry.statement}</div>
                                    <div className="history-timestamp">
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </div>
                                    <div className="history-status">
                                        {entry.result?.success !== false ?
                                            <CheckCircle size={16} className="status-success"/> :
                                            <XCircle size={16} className="status-error"/>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}

export default ReasoningDebuggerPanel;