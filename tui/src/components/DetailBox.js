import blessed from 'blessed';

export function createDetailBox() {
    return blessed.box({
        top: '60%',
        left: 0,
        width: '50%',
        height: '40%-2',
        label: 'Details',
        content: '',
        border: {
            type: 'line',
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0',
            },
        },
    });
}