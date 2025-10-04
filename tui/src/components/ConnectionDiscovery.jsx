import React from 'react';
import {Box, Text} from 'ink';
import PropTypes from 'prop-types';

const ConnectionDiscovery = ({connections, error = null, onSelectConnection, isDiscovering = false}) => {
    return (
        <Box flexDirection="column">
            <Text>Available Agent Connections:</Text>
            {error && <Text color="red">{error}</Text>}
            {connections.length === 0 && !error && (
                <Text color={isDiscovering ? "yellow" : "red"}>
                    {isDiscovering ? "Discovering agents..." : "No agents found. Searching..."}
                </Text>
            )}
            {connections.map(({url, status}) => (
                <Box key={url} borderStyle="single" padding={1} marginY={1}>
                    <Text>
                        Agent: {url} (Status: {status})
                    </Text>
                    <Box marginLeft={2}>
                        <Text onPress={() => onSelectConnection(url)} color="green">
                            Connect
                        </Text>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

ConnectionDiscovery.propTypes = {
    connections: PropTypes.arrayOf(
        PropTypes.shape({
            url: PropTypes.string.isRequired,
            status: PropTypes.string.isRequired,
        })
    ).isRequired,
    error: PropTypes.string,
    isDiscovering: PropTypes.bool,
    onSelectConnection: PropTypes.func.isRequired,
};

export default ConnectionDiscovery;