import blessed from 'blessed';

export function createHeader() {
    return blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: 1,
        content: ' SeNARS TUI ',
        style: {
            fg: 'white',
            bg: 'blue',
        },
    });
}