import blessed from 'blessed';

export function createLogBox() {
    return blessed.log({
        top: 2,
        left: '50%',
        width: '50%',
        height: '100%-4',
        label: 'Log',
        border: {
            type: 'line',
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0',
            },
        },
        scrollable: true,
        scrollbar: {
            ch: ' ',
            track: {
                bg: 'grey',
            },
            style: {
                inverse: true,
            },
        },
    });
}