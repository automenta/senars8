/**
 * @fileoverview Shared constants for the TUI to ensure a consistent look and feel.
 * @module TuiConstants
 */

export const EMOJIS = {
    HEADER: '💎',
    STATUS_CONNECTED: '🟢',
    STATUS_DISCONNECTED: '🔴',
    FOCUS: '⚡️',
    TASKS: '📝',
    BELIEFS: '💡',
    LOGS: '📜',
    DETAIL: '🔍',
    HELP: '❓',
    INPUT: '⌨️',
};

export const COLORS = {
    base: {
        bg: '#202020',
        fg: '#d0d0d0',
    },
    primary: {
        bg: '#2a2a2a',
        fg: '#e0e0e0',
    },
    accent: {
        bg: '#005f5f',
        fg: '#ffffff',
    },
    focus: {
        bg: '#008787',
        fg: '#ffffff',
    },
    border: {
        fg: '#505050',
        focus: '#00afaf',
    },
    scrollbar: {
        bg: '#353535',
    },
};

export const STYLES = {
    base: {
        fg: COLORS.base.fg,
        bg: COLORS.base.bg,
        border: {
            type: 'line',
            fg: COLORS.border.fg,
        },
        style: {
            scrollbar: COLORS.scrollbar,
        },
    },
    focused: {
        border: {
            type: 'line',
            fg: COLORS.border.focus,
        },
    },
};