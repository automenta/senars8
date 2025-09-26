import { COLORS, EMOJIS } from '../TuiConstants.js';

/**
 * Returns the configuration for the header component.
 * @returns {object} The configuration object for blessed.box.
 */
export function getHeaderConfig() {
    return {
        content: ` ${EMOJIS.HEADER} SeNARS TUI `,
        tags: true,
        style: {
            fg: COLORS.primary.fg,
            bg: COLORS.accent.bg,
        },
    };
}