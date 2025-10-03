/**
 * API request executor for the ToolSystem
 */
import {EventEmitter} from 'events';
import {debug, error as logError} from '../../utils/logger.js';
import { request } from 'http';
import { request as httpsRequest } from 'https';

class ApiExecutor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = config;
        this.defaultTimeout = config.timeout || 30000;
    }

    async makeRequest(params = {}) {
        const {
            url,
            method = 'GET',
            headers = {},
            body,
            timeout = this.defaultTimeout,
        } = params;
        
        return new Promise((resolve, reject) => {
            try {
                const urlObj = new URL(url);
                const isHttps = urlObj.protocol === 'https:';
                const requestFn = isHttps ? httpsRequest : request;
                
                const options = {
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    path: urlObj.pathname + urlObj.search,
                    method: method.toUpperCase(),
                    headers: headers,
                };
                
                const req = requestFn(options, (res) => {
                    let data = '';
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            let parsedData;
                            try {
                                parsedData = JSON.parse(data);
                            } catch {
                                parsedData = data; // Return as string if not JSON
                            }
                            
                            resolve({
                                url,
                                method: method.toUpperCase(),
                                statusCode: res.statusCode,
                                statusText: res.statusMessage,
                                headers: res.headers,
                                data: parsedData,
                                timestamp: Date.now()
                            });
                        } catch (parseError) {
                            reject(parseError);
                        }
                    });
                });
                
                req.on('error', (error) => {
                    reject(error);
                });
                
                req.setTimeout(timeout, () => {
                    req.destroy();
                    reject(new Error(`Request timeout after ${timeout}ms`));
                });
                
                if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
                    req.write(typeof body === 'string' ? body : JSON.stringify(body));
                }
                
                req.end();
            } catch (error) {
                logError('API request error:', error);
                reject(error);
            }
        });
    }

    async shutdown() {
        debug('API executor shutting down');
    }
}

export default ApiExecutor;