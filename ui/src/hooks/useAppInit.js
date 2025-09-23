import { useEffect } from 'react';
import agentService from '@/services/agentService';
import sonificationService from '@/services/sonificationService';

const useAppInit = () => {
    useEffect(() => {
        agentService.connect();
        const handleFirstInteraction = () => {
            sonificationService.initialize();
            window.removeEventListener('click', handleFirstInteraction);
        };
        window.addEventListener('click', handleFirstInteraction);
        return () => {
            agentService.disconnect();
            window.removeEventListener('click', handleFirstInteraction);
        };
    }, []);
};

export default useAppInit;
