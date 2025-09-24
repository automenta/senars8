import {useEffect, useMemo, useRef} from 'react';
import agentService from '../services/agentService';
import sonificationService from '../services/sonificationService';
import {useSettings} from '../context/useSettings';
import Bag from '@core/utils/bag';
import log from '@/utils/logger';

export function useNarsEventStream(capacity = 100) {
    const {isSonificationEnabled} = useSettings();
    const eventBag = useMemo(() => new Bag(capacity), [capacity]);
    const lastMessageRef = useRef(null);

    useEffect(() => {
        const handleMessage = (message) => {
            try {
                // Prevent duplicate messages
                if (lastMessageRef.current &&
                    JSON.stringify(message) === JSON.stringify(lastMessageRef.current)) {
                    return;
                }

                lastMessageRef.current = message;

                // Determine priority based on message type
                let priority = 1;
                if (message.type && message.type.includes('error')) {
                    priority = 10; // Higher priority for errors
                } else if (message.type && message.type.includes('critical')) {
                    priority = 9;
                } else if (message.type && message.type.includes('warning')) {
                    priority = 8;
                }

                eventBag.put(message, priority);

                if (isSonificationEnabled) {
                    sonificationService.playEventSound(message.type);
                }
            } catch (error) {
                log.error('Error in useNarsEventStream handleMessage:', error);
            }
        };

        // Check if agentService has the on method before attaching
        if (typeof agentService.on === 'function') {
            agentService.on('message', handleMessage);
        } else {
            log.error('agentService does not have an on method');
        }

        // Clean up
        return () => {
            if (typeof agentService.off === 'function') {
                agentService.off('message', handleMessage);
            }
        };
    }, [eventBag, isSonificationEnabled]);

    return useMemo(() => ({
        events: eventBag,
        clear: () => eventBag.clear(),
        size: eventBag.size,
        peek: () => eventBag.peek(),
        get: () => eventBag.get(),
    }), [eventBag]);
}
