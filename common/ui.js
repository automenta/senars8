import anside from './anside.js';

const DEFAULT_BANNER_WIDTH = 80;

export const printBanner = (text, {
    width = DEFAULT_BANNER_WIDTH,
    borderColor = anside.fg.cyan,
    textColor = anside.fg.yellow,
    isFooter = false
} = {}) => {
    const horizontalLine = '═'.repeat(width - 2);
    const topBorder = `╔${horizontalLine}╗`;
    const bottomBorder = `╚${horizontalLine}╝`;

    const padding = ' '.repeat(Math.floor((width - text.length - 2) / 2));
    const bannerText = `║${padding}${text}${padding}║`;

    console.log(`\n${anside.bright}${borderColor}${topBorder}${anside.reset}`);
    console.log(`${anside.bright}${textColor}${bannerText.padEnd(width + 10)}${anside.reset}`);
    console.log(`${anside.bright}${borderColor}${bottomBorder}${anside.reset}${isFooter ? '\n' : ''}`);
};