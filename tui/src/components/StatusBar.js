import { STYLES, COLORS } from '../TuiConstants.js';

/**
 * Returns the configuration for the status bar component.
 * @returns {object} The configuration object for blessed.box.
 */
export function getStatusBarConfig() {
    return {
        tags: true,
        style: {
            fg: COLORS.primary.fg,
            bg: COLORS.primary.bg,
        },
    };
}