const fs = require('fs');
const path = require('path');

const demosDir = path.resolve(__dirname, '../tests/demos');
const outputDir = path.resolve(__dirname, '../ui/src/generated');
const outputFile = path.join(outputDir, 'demos.json');

try {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const demoFiles = fs.readdirSync(demosDir)
        .filter(file => file.endsWith('-demo.js'))
        .map(file => {
            const name = file.replace(/-demo\.js$/, '');
            return {
                id: name,
                name: name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                path: `tests/demos/${file}`
            };
        });

    fs.writeFileSync(outputFile, JSON.stringify(demoFiles, null, 2));
    console.log(`Successfully generated demo list at ${outputFile}`);
} catch (error) {
    console.error('Error generating demo list:', error);
    process.exit(1);
}