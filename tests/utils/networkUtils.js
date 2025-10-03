import { createConnection } from 'net';

/**
 * Checks if a port is available for use.
 * @param {number} port - The port to check.
 * @returns {Promise<boolean>} True if the port is available.
 */
async function isPortAvailable(port) {
    return new Promise((resolve) => {
        const tester = createConnection({ port });

        tester.on('connect', () => {
            tester.end();
            resolve(false); // Port is in use
        });

        tester.on('error', (err) => {
            tester.destroy();
            // If ECONNREFUSED, it means no server is listening on that port, so it's available.
            // For any other error, we'll assume the port is not available for safety.
            resolve(err.code === 'ECONNREFUSED');
        });
    });
}

/**
 * Finds an available port by testing connections.
 * @param {number} startPort - Starting port to check.
 * @param {number} maxTries - Maximum number of ports to try.
 * @returns {Promise<number>} An available port number.
 */
export async function findAvailablePort(startPort = 8080, maxTries = 50) {
    for (let i = 0; i < maxTries; i++) {
        const port = startPort + i;
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error(`Could not find an available port in the range ${startPort}-${startPort + maxTries}.`);
}