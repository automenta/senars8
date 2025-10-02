import {spawn} from 'child_process';
import path from 'path';

class AsciinemaRecorder {
    constructor(outputDir) {
        this.outputDir = outputDir;
    }

    async recordSession(command, outputFile, options = {}) {
        const {timeout = 10000, inputs = []} = options;
        const castPath = path.join(this.outputDir, `${outputFile}.cast`);

        const child = spawn('asciinema', ['rec', castPath, '--command', command], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        if (inputs.length > 0) {
            let currentIndex = 0;
            const writeInput = () => {
                if (currentIndex < inputs.length) {
                    child.stdin.write(`${inputs[currentIndex]}\n`);
                    currentIndex++;
                    setTimeout(writeInput, 1000);
                } else {
                    setTimeout(() => child.stdin.end(), 1000);
                }
            };
            setTimeout(writeInput, 1000);
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                child.kill('SIGTERM');
                resolve(castPath);
            }, timeout);

            child.on('close', () => resolve(castPath));
            child.on('error', reject);
        });
    }
}

export default AsciinemaRecorder;