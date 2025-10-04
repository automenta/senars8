import React from 'react';
import {Box, Text} from 'ink';

const NarseseInput = ({agent}) => {
    return React.createElement(Box, {flexDirection: "column"},
        React.createElement(Text, {bold: true, color: "blue"}, "Narsese Input:"),
        React.createElement(Text, {color: "gray", marginTop: 1},
            "Connect to an agent and use the Web UI for Narsese input"
        ),
        React.createElement(Text, {color: "gray"},
            "Or send commands directly to the agent service"
        )
    );
};

export default NarseseInput;