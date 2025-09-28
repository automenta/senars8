import {useEffect, useState} from 'react';
import agentService from '@/services/agentService';
import sonificationService from '@/services/sonificationService';
import {CONNECTION_STATUS, MESSAGE_TYPES} from '@/constants/ui';

const useAppInit = () => {
    const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Set up connection status listener
        const statusHandler = (status) => {
            setConnectionStatus(status);
        };

        agentService.on(MESSAGE_TYPES.STATUS, statusHandler);

        // Attempt to connect to the agent service
        const initializeServices = async () => {
            try {
                await agentService.connect();

                // Set up first interaction handler for sonification
                const handleFirstInteraction = () => {
                    sonificationService.initialize();
                    window.removeEventListener('click', handleFirstInteraction);
                    window.removeEventListener('keydown', handleFirstInteraction);
                };

                window.addEventListener('click', handleFirstInteraction);
                window.addEventListener('keydown', handleFirstInteraction);

                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to initialize services:', error);
            }
        };

        initializeServices();

        // Cleanup function
        return () => {
            agentService.off(MESSAGE_TYPES.STATUS, statusHandler);
            agentService.disconnect();

            // Clean up event listeners
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
        };
    }, []);

    return {connectionStatus, isInitialized};
};

export default useAppInit;
