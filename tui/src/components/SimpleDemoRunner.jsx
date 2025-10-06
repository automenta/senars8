import React, {useState, useEffect, useCallback} from 'react';
import {Box, Text, useInput} from 'ink';
import fs from 'fs';
import path from 'path';
import {URL} from 'url';

// Simple demo discovery
const getDemoFiles = () => {
    try {
        const DEMO_DIR = path.resolve(process.cwd(), 'tests/demos');
        
        if (!fs.existsSync(DEMO_DIR)) {
            console.error('Demo directory not found:', DEMO_DIR);
            return {};
        }

        const files = fs.readdirSync(DEMO_DIR)
            .filter(file => file.endsWith('-demo.js') && file !== 'run-all.js' && file !== 'demos.js');

        const demos = files.map(file => {
            const filePath = path.join(DEMO_DIR, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const descriptionMatch = content.match(/\/\/\s*Description:\s*(.*)/);
                const categoryMatch = content.match(/\/\/\s*Category:\s*(.*)/);
                return {
                    file,
                    name: file.replace('-demo.js', ''),
                    description: descriptionMatch ? descriptionMatch[1].trim() : 'No description',
                    category: categoryMatch ? categoryMatch[1].trim() : 'General',
                    path: filePath
                };
            } catch (error) {
                console.warn(`Failed to read demo file ${file}:`, error.message);
                return {
                    file,
                    name: file.replace('-demo.js', ''),
                    description: 'Error reading file',
                    category: 'General',
                    path: filePath
                };
            }
        });

        // Group by category
        const categorized = demos.reduce((acc, demo) => {
            (acc[demo.category] = acc[demo.category] || []).push(demo);
            return acc;
        }, {});

        // Sort demos within each category
        for (const category in categorized) {
            categorized[category].sort((a, b) => a.name.localeCompare(b.name));
        }

        return categorized;
    } catch (error) {
        console.error('Error discovering demo files:', error);
        return {};
    }
};

// Simple demo execution
const runDemo = async (demoPath, onOutput, onComplete) => {
    try {
        // Educational header
        onOutput(`\n=== Running Demo: ${path.basename(demoPath, '-demo.js')} ===\n\n`);

        // Import and run the demo
        const demoModule = await import(demoPath);
        const demoFunction = demoModule.default || (Object.values(demoModule)[0]);

        // Capture console output
        const originalLog = console.log;
        const originalInfo = console.info;
        const originalError = console.error;

        console.log = (...args) => {
            const output = args.join(' ') + '\n';
            onOutput(output);
        };

        console.info = (...args) => {
            const output = `[INFO] ${args.join(' ')}\n`;
            onOutput(output);
        };

        console.error = (...args) => {
            const output = `[ERROR] ${args.join(' ')}\n`;
            onOutput(output);
        };

        // Execute the demo
        await demoFunction();

        // Restore original console methods
        console.log = originalLog;
        console.info = originalInfo;
        console.error = originalError;

        onOutput(`\n=== Demo completed successfully ===\n`);
        onComplete(true);
    } catch (error) {
        onOutput(`\n=== Demo failed: ${error.message} ===\n`);
        onComplete(false);
    }
};

// Simple List View component (20%)
const DemoListView = ({demos, selectedDemo, onSelectDemo, isRunning}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((input, key) => {
        if (isRunning) return;

        const allDemos = Object.values(demos).flat();
        const maxIndex = allDemos.length - 1;

        if (key.upArrow && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
        } else if (key.downArrow && selectedIndex < maxIndex) {
            setSelectedIndex(selectedIndex + 1);
        } else if (key.return) {
            const demo = allDemos[selectedIndex];
            if (demo) onSelectDemo(demo);
        }
    });

    let currentIndex = 0;
    const categories = Object.keys(demos).sort();

    return (
        <Box flexDirection="column" width="30%" borderStyle="single" padding={1}>
            <Text bold>Available Demos</Text>
            <Box flexDirection="column" marginTop={1}>
                {categories.map(category => {
                    const categoryDemos = demos[category];
                    return (
                        <Box key={category} flexDirection="column" marginBottom={1}>
                            <Text bold>{category}</Text>
                            {categoryDemos.map(demo => {
                                const isSelected = currentIndex === selectedIndex;
                                const isCurrentDemo = selectedDemo && selectedDemo.path === demo.path;
                                currentIndex++;
                                
                                return (
                                    <Text 
                                        key={demo.file}
                                        color={isSelected || isCurrentDemo ? 'green' : 'white'}
                                        backgroundColor={isSelected ? 'black' : undefined}
                                    >
                                        {isSelected ? '> ' : '  '}{demo.name}
                                    </Text>
                                );
                            })}
                        </Box>
                    );
                })}
            </Box>
            <Text dimColor marginTop={1}>↑↓ to navigate, Enter to run</Text>
        </Box>
    );
};

// Simple Text View component (70%)
const DemoTextView = ({output, isRunning}) => {
    return (
        <Box flexDirection="column" width="70%" borderStyle="single" padding={1} marginLeft={1}>
            <Text bold>Demo Output</Text>
            <Box flexDirection="column" marginTop={1} flexGrow={1}>
                {isRunning ? (
                    <Text color="yellow">Demo is running...</Text>
                ) : output ? (
                    <Text>{output}</Text>
                ) : (
                    <Text dimColor>Select a demo to run it</Text>
                )}
            </Box>
        </Box>
    );
};

// Main Simple Demo Runner Component
const SimpleDemoRunner = ({onExit}) => {
    const [demos, setDemos] = useState({});
    const [selectedDemo, setSelectedDemo] = useState(null);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    // Load demos on mount
    useEffect(() => {
        const categorizedDemos = getDemoFiles();
        setDemos(categorizedDemos);
    }, []);

    const handleSelectDemo = useCallback((demo) => {
        if (isRunning) return;

        setSelectedDemo(demo);
        setOutput('');
        setIsRunning(true);

        runDemo(
            demo.path,
            (newOutput) => setOutput(prev => prev + newOutput),
            (success) => {
                setIsRunning(false);
            }
        );
    }, [isRunning]);

    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            onExit && onExit();
        }
    });

    return (
        <Box flexDirection="column" height="100%">
            <Box marginBottom={1}>
                <Text bold>SeNARS Demo Runner</Text>
            </Box>
            
            <Box flexDirection="row" flexGrow={1}>
                <DemoListView 
                    demos={demos} 
                    selectedDemo={selectedDemo} 
                    onSelectDemo={handleSelectDemo}
                    isRunning={isRunning}
                />
                <DemoTextView 
                    output={output} 
                    isRunning={isRunning}
                />
            </Box>
            
            <Box marginTop={1}>
                <Text dimColor>Ctrl+C to exit</Text>
            </Box>
        </Box>
    );
};

export default SimpleDemoRunner;