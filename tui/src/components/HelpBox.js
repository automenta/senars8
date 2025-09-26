import blessed from 'blessed';
import {EMOJIS, STYLES} from '../TuiConstants.js';

/**
 * Creates the help box component. This box is shown dynamically.
 * @returns {blessed.box} The help box component.
 */
export function createHelpBox() {
    return blessed.box({
        label: ` ${EMOJIS.HELP} Help `,
        content: '', // Content will be set dynamically
        ...STYLES.base,
        tags: true,
        // Position and dimensions are set dynamically when shown
        top: 'center',
        left: 'center',
        width: '60%',
        height: '70%',
        hidden: true,
    });
}