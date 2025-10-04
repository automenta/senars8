import React from 'react';
import {Box, Text} from 'ink';

const AgentStatus = ({agent}) => {
    if (!agent) {
        return React.createElement(Text, {color: "gray"},
            "No agent selected"
        );
    }

    const state = agent.state || {};
    const stats = state.stats || {};
    const memory = state.memory || {};

    return React.createElement(Box, {flexDirection: "column"},
        React.createElement(Box, {flexDirection: "row", justifyContent: "space-between"},
            React.createElement(Box, {flexDirection: "column", width: "50%"},
                React.createElement(Text, {bold: true},
                    "Connection: "
                ),
                React.createElement(Text, {
                        color: agent.status === 'connected' ? 'green' :
                            agent.status === 'connecting' ? 'yellow' : 'red'
                    },
                    agent.status.toUpperCase()
                ),
                React.createElement(Text, {bold: true},
                    "URL: "
                ),
                React.createElement(Text, {color: "white"},
                    agent.url
                ),
                React.createElement(Text, {bold: true},
                    "Status: "
                ),
                React.createElement(Text, {
                        color: state.isRunning ? 'green' : 'red'
                    },
                    state.isRunning ? 'RUNNING' : 'STOPPED'
                )
            ),
            React.createElement(Box, {flexDirection: "column", width: "50%"},
                React.createElement(Text, {bold: true},
                    "Cycle: "
                ),
                React.createElement(Text, {color: "white"},
                    (state.cycleCount || 'N/A').toString()
                ),
                React.createElement(Text, {bold: true},
                    "Uptime: "
                ),
                React.createElement(Text, {color: "white"},
                    state.uptime || 'N/A'
                ),
                React.createElement(Text, {bold: true},
                    "Version: "
                ),
                React.createElement(Text, {color: "white"},
                    state.version || 'unknown'
                )
            )
        ),
        React.createElement(Text, {color: "yellow", bold: true},
            "Performance"
        ),
        React.createElement(Box, {flexDirection: "row", justifyContent: "space-between"},
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "CPS: "
                ),
                React.createElement(Text, {color: "white"},
                    (stats.cyclesPerSecond?.toFixed(2) || 'N/A').toString()
                )
            ),
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "Mem: "
                ),
                React.createElement(Text, {color: "white"},
                    `${stats.memoryUsedMB?.toFixed(1) || 'N/A'}MB`
                )
            ),
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "CPU: "
                ),
                React.createElement(Text, {color: "white"},
                    `${stats.cpuUsage?.toFixed(1) || 'N/A'}%`
                )
            ),
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "Tasks/s: "
                ),
                React.createElement(Text, {color: "white"},
                    (stats.tasksPerSecond?.toFixed(2) || 'N/A').toString()
                )
            )
        ),
        React.createElement(Text, {color: "magenta", bold: true},
            "Memory Stats"
        ),
        React.createElement(Box, {flexDirection: "row", justifyContent: "space-between"},
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "Beliefs: "
                ),
                React.createElement(Text, {color: "white"},
                    (memory.beliefs?.length || 0).toString()
                )
            ),
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "Goals: "
                ),
                React.createElement(Text, {color: "white"},
                    (memory.goals?.length || 0).toString()
                )
            ),
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "Tasks: "
                ),
                React.createElement(Text, {color: "white"},
                    (state.tasks || []).length.toString()
                )
            ),
            React.createElement(Box, {flexDirection: "column"},
                React.createElement(Text, {bold: true},
                    "Concepts: "
                ),
                React.createElement(Text, {color: "white"},
                    (memory.concepts?.length || 0).toString()
                )
            )
        )
    );
};

export default AgentStatus;