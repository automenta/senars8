import blessed from 'blessed';

export function createStatusBar() {
    return blessed.box({
        top: 1,
        left: 0,
        width: '100%',
        height: 1,
        style: {
            fg: 'white',
            bg: 'cyan',
        },
    });
}