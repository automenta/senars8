import { useEffect } from 'react';
import { useAgentService } from '../context/AgentProvider';
import { useNotification } from '../context/NotificationContext';

/**
 * A custom hook to handle application initialization logic,
 * including connecting to the agent service and setting up notifications.
 */
const useAppInit = () => {
    const agentService = useAgentService();
    const { addNotification } = useNotification();

    useEffect(() => {
        if (!agentService) return;

        const handleStatusChange = (status) => {
            addNotification({
                message: `Agent connection status: ${status}`,
                type: status === 'connected' ? 'success' : 'info',
            });
        };

        const handleError = (error) => {
            addNotification({
                message: `Agent error: ${error.message}`,
                type: 'error',
            });
        };

        agentService.on('status', handleStatusChange);
        agentService.on('error', handleError);

        // Initiate the connection
        agentService.connect();

        return () => {
            agentService.off('status', handleStatusChange);
            agentService.off('error', handleError);
            agentService.disconnect();
        };
    }, [agentService, addNotification]);
};

export default useAppInit;