import blessed from 'blessed';

export function createNarseseInput() {
    return blessed.textbox({
        bottom: 0,
        left: 0,
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