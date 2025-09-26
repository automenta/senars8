import blessed from 'blessed';

export function createBeliefsBox(onSelect) {
    const beliefsBox = blessed.list({
        top: '60%',
        left: '50%',
        width: '50%',
        height: '40%-2',
        label: 'Beliefs',
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

    beliefsBox.on('select', onSelect);

    return beliefsBox;
}