import { spawn } from 'child_process';

describe('TUI Integration Tests', () => {
  let agentProcess;
  let tuiProcess;

  // Start the agent before running TUI tests
  beforeAll(async () => {
    console.log('Starting agent server...');
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
    console.log('Cleaning up processes...');
    
    if (agentProcess) {
      agentProcess.kill();
    }
    
    if (tuiProcess) {
      tuiProcess.kill();
    }
    
    // Give some time for processes to terminate
    setTimeout(() => done(), 1000);
  });

  test('TUI can connect to agent service', async () => {
    return new Promise((resolve, reject) => {
      console.log('Starting TUI process...');
      
      // Start the TUI process
      tuiProcess = spawn('node', ['--eval', `
        import AgentCommunicationService from './tui/src/services/AgentCommunicationService.js';
        const service = new AgentCommunicationService('ws://localhost:8080');
        
        service.on('status', (status) => {
          console.log('TUI Connection Status:', status);
          if (status === 'connected') {
            console.log('TUI CONNECTED');
            process.exit(0);
          } else if (status === 'failed') {
            console.log('TUI CONNECTION_FAILED');
            process.exit(1);
          }
        });
        
        service.on('error', (error) => {
          console.log('TUI ERROR:', error);
          process.exit(1);
        });
        
        setTimeout(() => {
          console.log('TUI TIMEOUT');
          process.exit(1);
        }, 10000); // 10 second timeout
        
        service.connect();
      `], {
        cwd: '.',
        stdio: 'pipe'
      });

      let output = '';
      let error = '';

      tuiProcess.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        console.log('[TUI STDOUT]', dataStr);
        
        if (dataStr.includes('TUI CONNECTED')) {
          resolve();
        } else if (dataStr.includes('TUI CONNECTION_FAILED') || dataStr.includes('TUI ERROR')) {
          reject(new Error(`TUI connection failed: ${dataStr}`));
        }
      });

      tuiProcess.stderr.on('data', (data) => {
        const dataStr = data.toString();
        error += dataStr;
        console.error('[TUI STDERR]', dataStr);
      });

      tuiProcess.on('close', (code) => {
        if (code !== 0 && !output.includes('TUI CONNECTED')) {
          reject(new Error(`TUI process exited with code ${code}. Output: ${output}, Error: ${error}`));
        }
      });

      // Set a timeout for the entire test
      setTimeout(() => {
        reject(new Error('TUI connection test timed out'));
      }, 15000);
    });
  }, 20000); // 20 second timeout for this test
});