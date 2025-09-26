import { STYLES, EMOJIS, COLORS } from '../TuiConstants.js';

/**
 * Returns the configuration for the log box component.
 * @returns {object} The configuration object for blessed.log.
 */
export function getLogBoxConfig() {
    return {
        label: ` ${EMOJIS.LOGS} Logs `,
        ...STYLES.base,
        tags: true,
        scrollable: true,
        mouse: true,
        keys: true,
        vi: true,
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