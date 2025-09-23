import { useState, useEffect, useMemo } from 'react';
import agentService from '../services/agentService';
import sonificationService from '../services/sonificationService';
import { useSettings } from '../context/SettingsContext';
import Bag from '../../core/utils/bag';

export function useNarsEventStream(capacity = 100) {
    const { isSonificationEnabled } = useSettings();
    const eventBag = useMemo(() => new Bag(capacity), [capacity]);
    const [updateCount, setUpdateCount] = useState(0);

    useEffect(() => {
        const handleMessage = (message) => {
            // For now, we give all messages a priority of 1.
            // This could be enhanced to prioritize certain event types.
            eventBag.put(message, 1);

            if (isSonificationEnabled) {
                sonificationService.playEventSound(message.type);
            }

            setUpdateCount(c => c + 1);
        };

        agentService.on('message', handleMessage);

        return () => {
            agentService.off('message', handleMessage);
        };
    }, [eventBag]);

    return eventBag;
}
