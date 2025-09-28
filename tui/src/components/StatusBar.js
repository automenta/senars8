import {COLORS} from '@common/constants/tui.js';

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