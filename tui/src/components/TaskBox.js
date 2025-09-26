import blessed from 'blessed';

export function createTaskBox(onSelect) {
    const taskBox = blessed.list({
        top: 2,
        left: 0,
        width: '50%',
        height: '60%-2',
        label: 'Tasks',
        border: {
            type: 'line',
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0',
            },
            selected: {
                bg: 'blue',
            },
        },
        keys: true,
        mouse: true,
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

    taskBox.on('select', onSelect);

    return taskBox;
}