import {useEffect} from 'react';
import {useAgentService} from '../context/AgentProvider';
import {useNotifications} from '../context/NotificationContext';
import notificationService from '../services/notificationService';

/**
 * A custom hook to handle application initialization logic,
 * including connecting to the agent service and setting up notifications.
 */
const useAppInit = () => {
    const agentService = useAgentService();
    const {notifications} = useNotifications();

    useEffect(() => {
        if (!agentService) return;

        const handleStatusChange = (status) => {
            if (status === 'connected') {
                notificationService.addSuccess('Connected', `Agent connected successfully`);
            } else {
                notificationService.addInfo('Connection Status', `Agent status: ${status}`);
            }
        };

        const handleError = (error) => {
            notificationService.addError('Connection Error', `Agent error: ${error.message || error}`);
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