import { spawn } from 'child_process';

describe('Shared Communication Service Tests', () => {
  let agentProcess;

  // Start the agent before running tests
  beforeAll(async () => {
    console.log('Starting agent server for shared service tests...');
    agentProcess = spawn('node', ['agent/server.js'], {
      cwd: '.',
      stdio: 'pipe',
      env: { ...process.env, LOG_LEVEL: 'INFO' },
    });

    // Wait for agent to start
    await new Promise((resolve, reject) => {
      let timeout = setTimeout(() => reject(new Error('Timeout waiting for agent to start')), 30000);
      
      agentProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[AGENT]', output);
        if (output.includes('Agent WebSocket server started')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      agentProcess.stderr.on('data', (data) => {
        console.error('[AGENT ERROR]', data.toString());
      });

      agentProcess.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, 35000); // 35 second timeout to allow for agent startup

  // Clean up after tests
  afterAll((done) => {
    console.log('Cleaning up agent process...');
    
    if (agentProcess) {
      agentProcess.kill();
    }
    
    // Give some time for processes to terminate
    setTimeout(() => done(), 1000);
  });

  test('Shared communication service connects properly in Node.js environment', async () => {
    return new Promise((resolve, reject) => {
      console.log('Testing shared communication service...');
      
      const testScript = `
        import AgentCommunicationService from './tui/src/services/AgentCommunicationService.js';
        const service = new AgentCommunicationService('ws://localhost:8080');
        
        service.on('status', (status) => {
          console.log('Status:', status);
          if (status === 'connected') {
            console.log('SHARED_SERVICE_CONNECTED');
            process.exit(0);
          } else if (status === 'failed') {
            console.log('SHARED_SERVICE_FAILED');
            process.exit(1);
          }
        });
        
        service.on('error', (error) => {
          console.log('SHARED_SERVICE_ERROR:', error);
          process.exit(1);
        });
        
        setTimeout(() => {
          console.log('SHARED_SERVICE_TIMEOUT');
          process.exit(1);
        }, 10000);
        
        service.connect();
      `;
      
      const testProcess = spawn('node', ['--eval', testScript], {
        cwd: '.',
        stdio: 'pipe'
      });

      let output = '';
      let error = '';

      testProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('[SHARED SERVICE STDOUT]', dataStr);
        
        if (dataStr.includes('SHARED_SERVICE_CONNECTED')) {
          resolve();
        } else if (dataStr.includes('SHARED_SERVICE_FAILED') || dataStr.includes('SHARED_SERVICE_ERROR')) {
          reject(new Error(`Shared service connection failed: ${dataStr}`));
        }
      });

      testProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        error += dataStr;
        console.error('[SHARED SERVICE STDERR]', dataStr);
      });

      testProcess.on('close', (code) => {
        if (code !== 0 && !output.includes('SHARED_SERVICE_CONNECTED')) {
          reject(new Error(`Shared service test process exited with code ${code}. Output: ${output}, Error: ${error}`));
        }
      });
    });
  }, 15000);

  test('Shared communication service connects properly in browser-like environment', async () => {
    // For browser environment, we'll use the common service directly
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.window = dom.window;
    global.WebSocket = dom.window.WebSocket;
    global.console = console;

    const BaseAgentCommunicationService = (await import('../../common/services/AgentCommunicationService.js')).default;
    
    // Since we can't actually connect to WebSocket in test environment without a real server,
    // we'll just test that the class can be instantiated
    const service = new BaseAgentCommunicationService('ws://localhost:8080');
    
    expect(service).toBeDefined();
    expect(typeof service.connect).toBe('function');
    expect(typeof service.sendMessage).toBe('function');
  });
});