import blessed from 'blessed';

export function createCommandInput() {
    return blessed.textbox({
        bottom: 0,
        left: '50%',
        width: '50%',
        height: 1,
        style: {
            bg: 'black',
            fg: 'white',
            focus: {
                bg: 'grey',
            },
        },
        inputOnFocus: true,
    });
}