import blessed from 'blessed';

export function createHelpBox() {
    return blessed.box({
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        label: 'Help',
        content: `
    Keybindings:
    q, C-c      Quit
    i           Focus Narsese input
    :           Focus command input
    Up/Down     Navigate history/lists
    Enter       Submit input

    Commands:
    !help       Show this help
    !connect    Connect to agent
    !disconnect Disconnect from agent
    !clear      Clear log
        `,
        border: {
            type: 'line',
        },
        style: {
            fg: 'white',
            border: {
                fg: '#f0f0f0',
            },
        },
        hidden: true,
    });
}