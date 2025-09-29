import {useCallback, useState} from 'react';
import agentService from '@/services/agentService';
import {createTaskFromStatement, formatCoreDataForUI, validateNarseseStatement} from '@/utils/coreIntegration';

const useReasoningDebugger = () => {
    const [debugResults, setDebugResults] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const debugReasoning = useCallback(async (statement) => {
        setIsProcessing(true);

        try {
            // First, validate the statement using our utility
            const validation = validateNarseseStatement(statement);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Create a task from the statement using our utility
            const task = createTaskFromStatement(statement);

            // Send to agent for debugging
            return await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for reasoning debug response'));
                }, 15000); // 15 second timeout

                const handleResponse = (payload) => {
                    clearTimeout(timeout);
                    agentService.off('reasoning_debug_response', handleResponse);

                    // Process the response and add core details
                    const processedResponse = {
                        ...payload,
                        statement,
                        parsedTerm: validation.parsed,
                        task: formatCoreDataForUI(task),
                        timestamp: Date.now()
                    };

                    setDebugResults(processedResponse);
                    resolve(processedResponse);
                };

                agentService.on('reasoning_debug_response', handleResponse);

                // Send the debugging request
                agentService.sendMessage('reasoning_debug', {
                    statement,
                    parsedTerm: validation.parsed,
                    timestamp: Date.now()
                });
            });
        } catch (error) {
            console.error('Error in reasoning debugger:', error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const clearDebugResults = useCallback(() => {
        setDebugResults(null);
    }, []);

    return {
        debugResults,
        isProcessing,
        debugReasoning,
        clearDebugResults
    };
};

export default useReasoningDebugger;