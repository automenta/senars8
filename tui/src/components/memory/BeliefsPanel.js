import React, {useEffect, useState} from 'react';
import {Box, Text} from 'ink';
import {formatTaskForTUIDisplay} from '../../utils/coreIntegration.js';

const BeliefsPanel = ({agent}) => {
    const [beliefs, setBeliefs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!agent || !agent.apiService) return;

        const handleBeliefAdded = (belief) => {
            setBeliefs(prev => {
                const exists = prev.some(b => b.id === belief.id);
                if (!exists) {
                    return [...prev, belief];
                }
                return prev.map(b => b.id === belief.id ? belief : b);
            });
        };

        // Listen for belief updates from the agent
        agent.apiService.on('belief_added', handleBeliefAdded);
        agent.apiService.on('beliefs_response', (payload) => {
            if (payload && Array.isArray(payload.beliefs)) {
                setBeliefs(payload.beliefs);
            }
        });

        // Initial beliefs fetch
        const fetchBeliefs = async () => {
            setIsLoading(true);
            try {
                await agent.apiService.sendMessage('get_beliefs', {});
            } catch (error) {
                console.error('Error fetching beliefs:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBeliefs();

        // Cleanup
        return () => {
            agent.apiService.off('belief_added', handleBeliefAdded);
            agent.apiService.off('beliefs_response', handleBeliefAdded);
        };
    }, [agent]);

    const beliefsCount = beliefs.length;

    return React.createElement(Box, {flexDirection: "column", height: "100%"},
        React.createElement(Box, {flexDirection: "row", justifyContent: "space-between", marginBottom: 1},
            React.createElement(Text, {bold: true, color: "green"}, "Beliefs"),
            React.createElement(Text, {color: "gray"}, `(${beliefsCount})`)
        ),
        React.createElement(Box, {flexDirection: "column", flexGrow: 1},
            ...(isLoading
                    ? [React.createElement(Text, {color: "gray"}, "Loading beliefs...")]
                    : beliefs.length === 0
                        ? [React.createElement(Text, {color: "gray"}, "No beliefs to display")]
                        : beliefs.slice(0, 10).map((belief, index) => {  // Show first 10 beliefs
                            const formatted = formatTaskForTUIDisplay(belief);
                            if (!formatted) return null;

                            return React.createElement(Box, {key: index, flexDirection: "row", marginBottom: 1},
                                React.createElement(Text, {color: "white"},
                                    `${formatted.term} ${formatted.punctuation || '.'}`
                                )
                            );
                        })
            )
        )
    );
};

export default BeliefsPanel;