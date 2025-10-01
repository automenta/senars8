import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

/**
 * Console Animation Recorder - Records terminal output as animated sequences
 */
class ConsoleAnimationRecorder {
  constructor(outputDir) {
    this.outputDir = outputDir;
  }

  /**
   * Record a TUI session as an animation
   */
  async recordTUISession(script, duration = 10000) {
    return new Promise(async (resolve, reject) => {
      let animationFrames = [];
      let frameCounter = 0;
      const startTime = Date.now();
      
      const child = spawn('node', ['src/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(process.cwd(), 'tui'),
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let currentBuffer = '';
      
      child.stdout.on('data', (data) => {
        const newData = data.toString();
        currentBuffer += newData;
        
        // Process the buffer to separate frames (simplified approach)
        if (currentBuffer.includes('\n')) {
          const lines = currentBuffer.split('\n');
          currentBuffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          // Create a frame with timestamp
          const frame = {
            timestamp: Date.now() - startTime,
            content: lines.filter(line => line.trim() !== '').join('\n'),
            frameNumber: frameCounter++
          };
          
          animationFrames.push(frame);
        }
      });

      // Send commands from the script
      if (script && script.length > 0) {
        let commandIndex = 0;
        const sendNextCommand = () => {
          if (commandIndex < script.length) {
            child.stdin.write(script[commandIndex] + '\n');
            commandIndex++;
            setTimeout(sendNextCommand, 1500); // Wait 1.5s between commands
          } else {
            // Send exit after all commands are done
            setTimeout(() => child.stdin.write('exit\n'), 1000);
          }
        };
        sendNextCommand();
      }

      child.on('close', (code) => {
        // Add final frame if there's remaining buffer content
        if (currentBuffer.trim()) {
          animationFrames.push({
            timestamp: Date.now() - startTime,
            content: currentBuffer,
            frameNumber: frameCounter++
          });
        }
        
        resolve(animationFrames);
      });

      // Set timeout for the recording session
      setTimeout(() => {
        child.kill();
        resolve(animationFrames);
      }, duration);
    });
  }

  /**
   * Save animation as multiple text files representing frames
   */
  async saveAnimationAsFrames(animationFrames, filename) {
    const frameDir = path.join(this.outputDir, 'frames');
    await fs.mkdir(frameDir, { recursive: true });
    
    // Save each frame as a separate file
    for (const frame of animationFrames) {
      const framePath = path.join(frameDir, `${filename}-frame-${frame.frameNumber.toString().padStart(3, '0')}.txt`);
      await fs.writeFile(framePath, frame.content);
    }
    
    // Save animation metadata
    const metadataPath = path.join(frameDir, `${filename}-metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify({
      totalFrames: animationFrames.length,
      duration: animationFrames.length > 0 ? animationFrames[animationFrames.length - 1].timestamp : 0,
      frameInterval: animationFrames.length > 1 ? 
        (animationFrames[animationFrames.length - 1].timestamp - animationFrames[0].timestamp) / animationFrames.length : 0
    }, null, 2));
    
    // Save as a single file with frame separators too
    const combinedPath = path.join(this.outputDir, `${filename}-animation.txt`);
    let combinedContent = '';
    for (const frame of animationFrames) {
      combinedContent += `=== FRAME ${frame.frameNumber} (t+${frame.timestamp}ms) ===\n`;
      combinedContent += frame.content + '\n\n';
    }
    await fs.writeFile(combinedPath, combinedContent);
  }

  /**
   * Create a simple replay script from the animation frames
   */
  async createReplayScript(filename) {
    const scriptPath = path.join(this.outputDir, `${filename}-replay.js`);
    const scriptContent = `
// Auto-generated replay script for ${filename}
import fs from 'fs';
import readline from 'readline';

const frames = fs.readdirSync('./frames')
  .filter(f => f.startsWith('${filename}-frame-') && f.endsWith('.txt'))
  .sort()
  .map(f => fs.readFileSync('./frames/' + f, 'utf8'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Replaying ${filename} animation...');
console.log('(Press Enter to proceed to next frame, Ctrl+C to exit)');

let currentFrame = 0;

function showNextFrame() {
  if (currentFrame < frames.length) {
    console.clear();
    console.log(frames[currentFrame]);
    console.log('\\nFrame ' + (currentFrame + 1) + ' of ' + frames.length);
    
    rl.question('Press Enter for next frame...', (answer) => {
      currentFrame++;
      showNextFrame();
    });
  } else {
    console.log('\\nAnimation replay completed!');
    rl.close();
  }
}

showNextFrame();
`;
    await fs.writeFile(scriptPath, scriptContent);
  }
}

export default ConsoleAnimationRecorder;