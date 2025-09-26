import blessed from 'blessed';
import { STYLES, EMOJIS } from '../TuiConstants.js';

/**
 * Creates the detail view box component. This box is shown dynamically.
 * @returns {blessed.box} The detail box component.
 */
export function createDetailBox() {
    return blessed.box({
        label: ` ${EMOJIS.DETAIL} Details `,
        content: '',
        ...STYLES.base,
        tags: true,
        scrollable: true,
        mouse: true,
        keys: true,
        vi: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            track: {
                bg: STYLES.scrollbar.bg,
            },
            style: {
                inverse: true,
            },
        },
        // Position and dimensions are set dynamically when shown
        top: 'center',
        left: 'center',
        width: '80%',
        height: '80%',
        hidden: true,
    });
}