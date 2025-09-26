import {COLORS, EMOJIS, STYLES} from '../TuiConstants.js';

/**
 * Returns the configuration for the command input component.
 * @returns {object} The configuration object for blessed.textbox.
 */
export function getCommandInputConfig() {
    return {
        label: ` ${EMOJIS.INPUT} Command `,
        ...STYLES.base,
        style: {
            ...STYLES.base.style,
            focus: {
                bg: COLORS.focus.bg,
                fg: COLORS.focus.fg,
            },
        },
        inputOnFocus: true,
        tags: true,
    };
}