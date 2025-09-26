import { STYLES, EMOJIS, COLORS } from '../TuiConstants.js';

/**
 * Returns the configuration for the task list component.
 * @returns {object} The configuration object for blessed.list.
 */
export function getTaskBoxConfig() {
    return {
        label: ` ${EMOJIS.TASKS} Tasks `,
        ...STYLES.base,
        style: {
            ...STYLES.base.style,
            selected: {
                bg: COLORS.accent.bg,
                fg: COLORS.accent.fg,
            },
        },
        tags: true,
        keys: true,
        mouse: true,
        scrollable: true,
        scrollbar: {
            ch: ' ',
            track: {
                bg: COLORS.scrollbar.bg,
            },
            style: {
                inverse: true,
            },
        },
    };
}