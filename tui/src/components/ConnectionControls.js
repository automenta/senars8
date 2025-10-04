import React from 'react';
import {Box, Text} from 'ink';

const ConnectionControls = ({onConnect, onDisconnect, connectedAgents}) => {
    return React.createElement(Box, {flexDirection: "column"},
        React.createElement(Text, {bold: true},
            "Connection Controls:"
        ),
        React.createElement(Text, {color: "gray"},
            "• Connect to agents from the list"
        ),
        React.createElement(Text, {color: "gray"},
            "• Click CONNECT/DISCONNECT to manage connections"
        ),
        React.createElement(Text, {color: "gray"},
            `• Active connections: ${connectedAgents.length}`
        )
    );
};

export default ConnectionControls;