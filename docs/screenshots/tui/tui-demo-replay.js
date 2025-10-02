// Auto-generated replay script for tui-demo
import fs from 'fs';
import readline from 'readline';

const frames = fs.readdirSync('./frames')
    .filter(f => f.startsWith('tui-demo-frame-') && f.endsWith('.txt'))
    .sort()
    .map(f => fs.readFileSync('./frames/' + f, 'utf8'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('Replaying tui-demo animation...');
console.log('(Press Enter to proceed to next frame, Ctrl+C to exit)');

let currentFrame = 0;

function showNextFrame() {
    if (currentFrame < frames.length) {
        console.clear();
        console.log(frames[currentFrame]);
        console.log('\nFrame ' + (currentFrame + 1) + ' of ' + frames.length);

        rl.question('Press Enter for next frame...', (answer) => {
            currentFrame++;
            showNextFrame();
        });
    } else {
        console.log('\nAnimation replay completed!');
        rl.close();
    }
}

showNextFrame();
