import fs from 'fs';

export function loadJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return null;
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
}