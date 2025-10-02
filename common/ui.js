import anside from './anside.js';

const DEFAULT_BANNER_WIDTH = 80;

/**
 * Prints a styled banner to the console.
 *
 * @param {string} text - The text to display in the banner.
 * @param {object} [options={}] - Customization options.
 * @param {string} [options.char='='] - The character to use for the border.
 * @param {number} [options.width=DEFAULT_BANNER_WIDTH] - The total width of the banner.
 * @param {string} [options.borderColor=anside.fg.cyan] - The color of the border.
 * @param {string} [options.textColor=anside.fg.yellow] - The color of the text.
 * @param {boolean} [options.isFooter=false] - If true, adds a newline at the end.
 */
function printBanner(text, {
    width = DEFAULT_BANNER_WIDTH,
    borderColor = anside.fg.cyan,
    textColor = anside.fg.yellow,
    isFooter = false
} = {}) {
    const horizontalLine = '═'.repeat(width - 2);
    const topBorder = `╔${horizontalLine}╗`;
    const bottomBorder = `╚${horizontalLine}╝`;

    const padding = ' '.repeat(Math.floor((width - text.length - 2) / 2));
    const bannerText = `║${padding}${text}${padding}║`;

    console.log(`\n${anside.bright}${borderColor}${topBorder}${anside.reset}`);
    console.log(`${anside.bright}${textColor}${bannerText.padEnd(width + 10)}${anside.reset}`);
    console.log(`${anside.bright}${borderColor}${bottomBorder}${anside.reset}${isFooter ? '\n' : ''}`);
}

export {
    printBanner
};