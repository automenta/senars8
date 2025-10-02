import {COLORS, EMOJIS, STYLES} from '@senars/common/constants/tui.js';

/**
 * Returns the configuration for the Narsese input component.
 * @returns {object} The configuration object for blessed.textbox.
 */
export function getNarseseInputConfig() {
    return {
        label: ` ${EMOJIS.INPUT} Narsese `,
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