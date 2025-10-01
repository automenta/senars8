/**
 * API Executor for External Service Integrations
 * Provides HTTP client capabilities with authentication and rate limiting
 */

import { debug, error as logError, info, warn } from '../utils/logger.js';
import { createUnifiedErrorHandler } from '../utils/errorHandler.js';
import { randomUUID } from 'crypto';

const errorHandler = createUnifiedErrorHandler('ApiExecutor');

class ApiExecutor {
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout || 30000,
            maxRedirects: config.maxRedirects || 5,
            userAgent: config.userAgent || 'SeNARS-Agent/1.0',
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            rateLimiting: config.rateLimiting ?? true,
            maxRequestsPerSecond: config.maxRequestsPerSecond || 10,
            enableCaching: config.enableCaching ?? true,
            cacheTtl: config.cacheTtl || 300000, // 5 minutes
            ...config
        };
        
        this.requestQueue = [];
        this.activeRequests = new Map();
        this.cache = new Map();
        this.rateLimiter = new RateLimiter(this.config.maxRequestsPerSecond);
        this.authProviders = new Map();
        
        this.initializeAuthProviders();
        
        info('ApiExecutor initialized');
    }

    initializeAuthProviders() {
        // Basic authentication
        this.authProviders.set('basic', this.basicAuth.bind(this));
        
        // Bearer token authentication
        this.authProviders.set('bearer', this.bearerAuth.bind(this));
        
        // API key authentication
        this.authProviders.set('apikey', this.apiKeyAuth.bind(this));
        
        // OAuth 2.0 authentication
        this.authProviders.set('oauth2', this.oauth2Auth.bind(this));
        
        // Custom authentication
        this.authProviders.set('custom', this.customAuth.bind(this));
    }

    async makeRequest(params) {
        const { 
            url, 
            method, 
            headers, 
            body, 
            timeout, 
            maxRedirects,
            auth,
            retryAttempts,
            cacheKey,
            followRedirects
        } = {
            method: 'GET',
            headers: {},
            timeout: this.config.timeout,
            maxRedirects: this.config.maxRedirects,
            retryAttempts: this.config.retryAttempts,
            followRedirects: true,
            ...params
        };

        const requestId = randomUUID();
        const startTime = Date.now();

        try {
            // Check cache first
            if (this.config.enableCaching && cacheKey && method === 'GET') {
                const cached = this.cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < this.config.cacheTtl) {
                    debug(`Cache hit for: ${cacheKey}`);
                    return cached.data;
                }
            }
            
            // Apply rate limiting
            if (this.config.rateLimiting) {
                await this.rateLimiter.wait();
            }
            
            debug(`Making ${method} request to: ${url} (request: ${requestId})`);
            
            // Prepare request options
            const requestOptions = await this.prepareRequestOptions({
                method,
                headers,
                body,
                timeout,
                maxRedirects,
                auth,
                followRedirects
            });
            
            // Execute request with retries
            const result = await this.executeWithRetries(
                () => this.executeRequest(url, requestOptions, requestId),
                retryAttempts,
                requestId
            );
            
            const duration = Date.now() - startTime;
            
            // Cache successful GET requests
            if (this.config.enableCaching && cacheKey && method === 'GET' && result.success) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            info(`API request completed: ${method} ${url} (request: ${requestId}, duration: ${duration}ms, status: ${result.status})`);
            
            return {
                success: true,
                requestId,
                url,
                method,
                result,
                duration
            };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            
            logError(`API request failed: ${method} ${url} (request: ${requestId})`, error);
            
            return {
                success: false,
                requestId,
                url,
                method,
                error: error.message,
                duration
            };
        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    async prepareRequestOptions(options) {
        const { method, headers, body, timeout, maxRedirects, auth, followRedirects } = options;
        
        const requestOptions = {
            method,
            headers: {
                'User-Agent': this.config.userAgent,
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                ...headers
            },
            timeout,
            follow: followRedirects ? maxRedirects : 0
        };
        
        // Apply authentication
        if (auth) {
            await this.applyAuthentication(requestOptions, auth);
        }
        
        // Handle request body
        if (body) {
            if (typeof body === 'object') {
                requestOptions.headers['Content-Type'] = 'application/json';
                requestOptions.body = JSON.stringify(body);
            } else if (typeof body === 'string') {
                if (!requestOptions.headers['Content-Type']) {
                    requestOptions.headers['Content-Type'] = 'text/plain';
                }
                requestOptions.body = body;
            }
        }
        
        return requestOptions;
    }

    async applyAuthentication(requestOptions, auth) {
        const { type, ...authParams } = auth;
        
        const authHandler = this.authProviders.get(type);
        if (!authHandler) {
            throw new Error(`Unknown authentication type: ${type}`);
        }
        
        await authHandler(requestOptions, authParams);
    }

    async basicAuth(requestOptions, { username, password }) {
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        requestOptions.headers['Authorization'] = `Basic ${encoded}`;
    }

    async bearerAuth(requestOptions, { token }) {
        requestOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    async apiKeyAuth(requestOptions, { key, value, header = 'X-API-Key' }) {
        requestOptions.headers[header] = value;
    }

    async oauth2Auth(requestOptions, { accessToken, tokenType = 'Bearer' }) {
        requestOptions.headers['Authorization'] = `${tokenType} ${accessToken}`;
    }

    async customAuth(requestOptions, { handler }) {
        if (typeof handler === 'function') {
            await handler(requestOptions);
        } else {
            throw new Error('Custom auth handler must be a function');
        }
    }

    async executeRequest(url, options, requestId) {
        // Use node-fetch or similar library
        const fetch = await this.getFetchImplementation();
        
        const response = await fetch(url, options);
        
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: this.parseHeaders(response.headers),
            url: response.url,
            redirected: response.redirected
        };
        
        // Parse response body
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
            try {
                result.data = await response.json();
            } catch (error) {
                result.data = await response.text();
                result.parseError = error.message;
            }
        } else if (contentType.includes('text/')) {
            result.data = await response.text();
        } else {
            // Binary data
            result.data = await response.buffer();
            result.size = result.data.length;
        }
        
        // Check for errors
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return result;
    }

    async executeWithRetries(executeFn, maxAttempts, requestId) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                debug(`Request attempt ${attempt}/${maxAttempts} (request: ${requestId})`);
                return await executeFn();
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    throw error;
                }
                
                // Don't retry on the last attempt
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                // Wait before retry
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                debug(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }

    parseHeaders(headers) {
        const parsed = {};
        for (const [key, value] of headers.entries()) {
            parsed[key] = value;
        }
        return parsed;
    }

    async getFetchImplementation() {
        // Try to use node-fetch or built-in fetch
        try {
            return (await import('node-fetch')).default;
        } catch (error) {
            // Fallback to built-in fetch (Node.js 18+)
            if (typeof fetch === 'function') {
                return fetch;
            }
            throw new Error('No fetch implementation available. Please install node-fetch.');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Specialized API methods
    async get(url, params = {}) {
        return this.makeRequest({ ...params, url, method: 'GET' });
    }

    async post(url, data, params = {}) {
        return this.makeRequest({ ...params, url, method: 'POST', body: data });
    }

    async put(url, data, params = {}) {
        return this.makeRequest({ ...params, url, method: 'PUT', body: data });
    }

    async delete(url, params = {}) {
        return this.makeRequest({ ...params, url, method: 'DELETE' });
    }

    async patch(url, data, params = {}) {
        return this.makeRequest({ ...params, url, method: 'PATCH', body: data });
    }

    // Batch processing
    async batchRequests(requests, options = {}) {
        const { concurrency = 5, delay = 100 } = options;
        
        const results = [];
        const queue = [...requests];
        
        const executeBatch = async () => {
            const batch = queue.splice(0, concurrency);
            const promises = batch.map(request => this.makeRequest(request));
            
            const batchResults = await Promise.allSettled(promises);
            results.push(...batchResults);
            
            if (queue.length > 0) {
                await this.sleep(delay);
                return executeBatch();
            }
        };
        
        await executeBatch();
        
        return results.map(result => 
            result.status === 'fulfilled' 
                ? { success: true, data: result.value }
                : { success: false, error: result.reason }
        );
    }

    // Web scraping utilities
    async scrapeWebPage(url, options = {}) {
        const { selectors, waitFor, screenshot } = options;
        
        // First, get the page content
        const response = await this.get(url);
        
        if (!response.success) {
            return response;
        }
        
        const result = {
            success: true,
            url,
            title: this.extractTitle(response.result.data),
            content: response.result.data
        };
        
        // Extract data using selectors if provided
        if (selectors && typeof selectors === 'object') {
            result.extracted = this.extractData(response.result.data, selectors);
        }
        
        return result;
    }

    extractTitle(html) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        return titleMatch ? titleMatch[1].trim() : null;
    }

    extractData(html, selectors) {
        const extracted = {};
        
        for (const [key, selector] of Object.entries(selectors)) {
            try {
                // Simple regex-based extraction (for demo purposes)
                // In production, you'd use a proper HTML parser
                const regex = new RegExp(`<[^>]*${selector}[^>]*>([^<]*)</`, 'i');
                const match = html.match(regex);
                extracted[key] = match ? match[1].trim() : null;
            } catch (error) {
                extracted[key] = null;
            }
        }
        
        return extracted;
    }

    // Cache management
    clearCache() {
        this.cache.clear();
        debug('API response cache cleared');
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }

    // Rate limiter class
    async getStatistics() {
        const totalRequests = this.activeRequests.size;
        const cacheStats = this.getCacheStats();
        
        return {
            activeRequests: totalRequests,
            cacheSize: cacheStats.size,
            rateLimitingEnabled: this.config.rateLimiting,
            maxRequestsPerSecond: this.config.maxRequestsPerSecond
        };
    }

    async shutdown() {
        info('Shutting down ApiExecutor...');
        
        // Cancel active requests
        for (const [requestId, controller] of this.activeRequests) {
            try {
                controller.abort();
                debug(`Cancelled request: ${requestId}`);
            } catch (error) {
                warn(`Failed to cancel request ${requestId}:`, error.message);
            }
        }
        
        this.activeRequests.clear();
        this.cache.clear();
        
        info('ApiExecutor shutdown completed');
    }
}

// Rate limiter implementation
class RateLimiter {
    constructor(maxRequestsPerSecond) {
        this.maxRequestsPerSecond = maxRequestsPerSecond;
        this.requests = [];
    }

    async wait() {
        const now = Date.now();
        
        // Remove requests older than 1 second
        this.requests = this.requests.filter(time => now - time < 1000);
        
        // If we've hit the limit, wait
        if (this.requests.length >= this.maxRequestsPerSecond) {
            const oldestRequest = this.requests[0];
            const waitTime = 1000 - (now - oldestRequest);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        // Add current request
        this.requests.push(now);
    }
}

export default ApiExecutor;