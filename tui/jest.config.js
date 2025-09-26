/** @type {import('jest').Config} */
const config = {
    // Use babel-jest to transform files
    "transform": {
        "^.+\\.(js|mjs)$": "babel-jest"
    },
    "testEnvironment": "node",
    "moduleFileExtensions": [
        "js",
        "mjs"
    ],
    // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
    "moduleNameMapper": {
        // Handle module aliases (if you have them in your project)
    },
    // The glob patterns Jest uses to detect test files
    "testMatch": [
        "**/tests/**/*.test.js"
    ],
};

export default config;