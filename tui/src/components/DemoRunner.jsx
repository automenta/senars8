import React, {useCallback, useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {Container, Flex, MainLayout, Panel, ScrollableArea} from './Layout.jsx';
import {Badge, Button, Card} from './Interactive.jsx';
import {theme} from '../theme.js';
import fs from 'fs';
import path from 'path';
import {URL} from 'url';

// Demo discovery and management
const getDemoFiles = () => {
    try {
        // Try multiple possible paths for the demo directory
        const possiblePaths = [
            path.resolve(process.cwd(), 'tests/demos'),
            path.resolve(process.cwd(), '..', 'tests/demos'),
            path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../tests/demos')
        ];

        let DEMO_DIR = null;
        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                DEMO_DIR = testPath;
                break;
            }
        }

        if (!DEMO_DIR) {
            console.warn('Demo directory not found. Tried paths:', possiblePaths);
            console.warn('Current working directory:', process.cwd());
            console.warn('Script directory:', path.dirname(new URL(import.meta.url).pathname));
            return {};
        }

        console.log('Found demo directory at:', DEMO_DIR);

        if (!fs.existsSync(DEMO_DIR)) {
            console.warn('Demo directory not found:', DEMO_DIR);
            return {};
        }

        const allFiles = fs.readdirSync(DEMO_DIR);
        console.log('All files in demo directory:', allFiles);
        const files = allFiles
            .filter(file => file.endsWith('-demo.js') && file !== 'run-all.js' && file !== 'interactive-runner.js');
        console.log('Filtered demo files:', files);

        const demos = files.map(file => {
            const filePath = path.join(DEMO_DIR, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const descriptionMatch = content.match(/\/\/\s*Description:\s*(.*)/);
                const categoryMatch = content.match(/\/\/\s*Category:\s*(.*)/);
                const demo = {
                    file,
                    name: file.replace('-demo.js', ''),
                    description: descriptionMatch ? descriptionMatch[1].trim() : 'Interactive demonstration',
                    category: categoryMatch ? categoryMatch[1].trim() : 'General',
                    path: filePath
                };
                console.log('Processed demo:', demo);
                return demo;
            } catch (error) {
                console.warn(`Failed to read demo file ${file}:`, error.message);
                return {
                    file,
                    name: file.replace('-demo.js', ''),
                    description: 'Demo file (error reading metadata)',
                    category: 'General',
                    path: filePath
                };
            }
        });

        // Group demos by category
        const categorized = demos.reduce((acc, demo) => {
            const category = demo.category || 'General';
            (acc[category] = acc[category] || []).push(demo);
            return acc;
        }, {});

        // Sort demos within each category
        for (const category in categorized) {
            categorized[category].sort((a, b) => a.name.localeCompare(b.name));
        }

        console.log('Final categorized demos:', categorized);
        console.log('Categories:', Object.keys(categorized));
        console.log('Total demos:', Object.values(categorized).flat().length);

        return categorized;
    } catch (error) {
        console.error('Error discovering demo files:', error);
        return {};
    }
};

// Demo execution with output capture and educational enhancements
const runDemo = async (demoPath, onOutput, onComplete) => {
    const demoName = path.basename(demoPath, '-demo.js');

    try {
        // Educational header with demo context
        onOutput(`🎓 ${'='.repeat(60)}\n`);
        onOutput(`📚 EDUCATIONAL DEMO: ${demoName.toUpperCase()}\n`);
        onOutput(`🎓 ${'='.repeat(60)}\n\n`);

        // Read demo file to extract educational content
        const demoContent = fs.readFileSync(demoPath, 'utf-8');
        const description = demoContent.match(/\/\/\s*Description:\s*(.*)/)?.[1] || 'Interactive demonstration';
        const category = demoContent.match(/\/\/\s*Category:\s*(.*)/)?.[1] || 'General';

        // Enhanced educational context
        onOutput(`🏷️  Category: ${category}\n`);
        onOutput(`📝 Description: ${description}\n`);
        onOutput(`📁 Location: ${demoPath}\n`);
        onOutput(`🎯 Learning Objectives:\n`);
        onOutput(`   • Understand core concepts through hands-on examples\n`);
        onOutput(`   • See real-time system behavior and responses\n`);
        onOutput(`   • Learn by observing system reasoning patterns\n\n`);

        onOutput(`🚀 Starting demonstration...\n`);
        onOutput(`⏳ Loading demo module...\n\n`);

        // Import and run the demo
        const demoModule = await import(demoPath);
        const demoFunction = demoModule.default || (Object.values(demoModule)[0]);

        // Override console methods to capture output with educational enhancements
        const originalLog = console.log;
        const originalInfo = console.info;
        const originalError = console.error;

        const capturedOutput = [];
        let stepCounter = 1;

        console.log = (...args) => {
            const output = args.join(' ') + '\n';
            // Add educational step markers for key outputs
            const enhancedOutput = output.length > 10 ?
                `📋 Step ${stepCounter++}: ${output}` : output;
            capturedOutput.push(enhancedOutput);
            onOutput(enhancedOutput);
        };

        console.info = (...args) => {
            const output = `ℹ️  ${args.join(' ')}\n`;
            capturedOutput.push(output);
            onOutput(output);
        };

        console.error = (...args) => {
            const output = `❌ ERROR: ${args.join(' ')}\n`;
            capturedOutput.push(output);
            onOutput(output);
        };

        // Execute the demo
        await demoFunction();

        // Restore original console methods
        console.log = originalLog;
        console.info = originalInfo;
        console.error = originalError;

        // Educational summary
        onOutput(`\n🎓 ${'='.repeat(60)}\n`);
        onOutput(`✅ DEMO COMPLETED SUCCESSFULLY\n`);
        onOutput(`🎓 ${'='.repeat(60)}\n`);
        onOutput(`📊 Demo Statistics:\n`);
        onOutput(`   • Demo: ${demoName}\n`);
        onOutput(`   • Category: ${category}\n`);
        onOutput(`   • Steps executed: ${stepCounter - 1}\n`);
        onOutput(`   • Status: ✅ Completed without errors\n\n`);

        onOutput(`🎓 What you learned:\n`);
        onOutput(`   • Observed real-time system behavior\n`);
        onOutput(`   • Saw reasoning patterns in action\n`);
        onOutput(`   • Experienced interactive learning\n`);
        onOutput(`   • Gained deeper understanding of concepts\n\n`);

        onOutput(`💡 Tip: Try other demos in the same category to build comprehensive knowledge!\n`);

        onComplete(capturedOutput.join(''));

    } catch (error) {
        onOutput(`\n🎓 ${'='.repeat(60)}\n`);
        onOutput(`❌ DEMO ENCOUNTERED AN ERROR\n`);
        onOutput(`🎓 ${'='.repeat(60)}\n`);
        onOutput(`🔍 Error Details:\n`);
        onOutput(`   • Demo: ${demoName}\n`);
        onOutput(`   • Error: ${error.message}\n`);
        onOutput(`   • Location: ${demoPath}\n\n`);

        onOutput(`🛠️  Troubleshooting Tips:\n`);
        onOutput(`   • Check if all dependencies are installed\n`);
        onOutput(`   • Verify system requirements are met\n`);
        onOutput(`   • Try running the demo individually: node ${demoPath}\n`);
        onOutput(`   • Check the logs for more detailed error information\n\n`);

        onComplete(null);
    }
};

// Enhanced Demo List Component for sidebar with educational enhancements
const DemoList = ({demos, selectedDemo, onSelectDemo, isRunning}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [expandedCategories, setExpandedCategories] = useState(new Set(['Core Reasoning']));
    const [showDescriptions, setShowDescriptions] = useState(true);
    const [showHelp, setShowHelp] = useState(false);

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
        } else if (input === 'd') {
            setShowDescriptions(!showDescriptions);
        } else if (input === 'h') {
            setShowHelp(!showHelp);
        } else if (key.escape) {
            setShowHelp(false);
        }
    });

    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    // Category educational context
    const getCategoryDescription = (category) => {
        const descriptions = {
            'Core Reasoning': 'Fundamental reasoning capabilities and inference',
            'Reasoning': 'Advanced reasoning patterns and logic',
            'Action & Planning': 'Goal-driven behavior and task execution',
            'NLP Integration': 'Natural language processing capabilities',
            'Template': 'Demo templates and examples',
            'Debugging': 'Debugging and diagnostic tools',
            'API Usage': 'System API usage examples',
            'Other': 'Miscellaneous demonstrations',
            'Analysis': 'System analysis and diagnostic capabilities',
            'Language Model': 'Large language model integration features',
            'Narsese Language': 'Narsese language processing capabilities',
            'Perception': 'Sensory input and perception processing',
            'Memory': 'Memory management and forgetting mechanisms',
            'Showcase': 'Comprehensive system demonstrations',
            'General': 'General purpose demonstrations'
        };
        return descriptions[category] || 'Educational demonstrations';
    };

    let currentIndex = 0;
    const categories = Object.keys(demos).sort();

    return (
        <Panel title="📚 Available Demos" variant="primary">
            <ScrollableArea height="100%">
                {/* Help overlay */}
                {showHelp && (
                    <Box flexDirection="column" backgroundColor="#000080" padding={1} margin={1} borderStyle="double">
                        <Text bold color="#ffffff">📚 Demo List Controls</Text>
                        <Text color="#ffffff">• ↑↓ - Navigate demos</Text>
                        <Text color="#ffffff">• Enter - Run selected demo</Text>
                        <Text color="#ffffff">• 'd' - Toggle descriptions</Text>
                        <Text color="#ffffff">• 'h' - Toggle this help</Text>
                        <Text color="#ffffff">• Mouse click - Select demo/category</Text>
                        <Text color="#ffffff"></Text>
                        <Text color="#ffffff">Click on category name to expand/collapse</Text>
                        <Text color="#ffffff"></Text>
                        <Text bold color="#ffffff">Press 'h' or Escape to close</Text>
                    </Box>
                )}

                {/* Legend */}
                <Box marginBottom={1}>
                    <Text color={theme.colors.textMuted} dimColor>
                        🎓 'd': descriptions • 'h': help • ↑↓: navigate • Enter: run
                    </Text>
                </Box>

                {categories.map(category => {
                    const categoryDemos = demos[category];
                    const isExpanded = expandedCategories.has(category);

                    return (
                        <Box key={category} flexDirection="column" marginBottom={1}>
                            <Box flexDirection="column" marginBottom={0}>
                                <Button
                                    size="sm"
                                    variant={isExpanded ? "primary" : "default"}
                                    onClick={() => toggleCategory(category)}
                                    disabled={isRunning}
                                >
                                    {isExpanded ? '▼' : '▶'} {category} ({categoryDemos.length})
                                </Button>
                                {isExpanded && (
                                    <Text color={theme.colors.textMuted} dimColor>
                                        {getCategoryDescription(category)}
                                    </Text>
                                )}
                            </Box>

                            {isExpanded && (
                                <Box flexDirection="column" marginLeft={2} marginTop={0}>
                                    {categoryDemos.map(demo => {
                                        const isSelected = currentIndex === selectedIndex;
                                        const isCurrentDemo = selectedDemo && selectedDemo.path === demo.path;
                                        currentIndex++;

                                        return (
                                            <Box key={demo.file} flexDirection="column" marginBottom={1}>
                                                <Button
                                                    size="sm"
                                                    variant={isSelected || isCurrentDemo ? "success" : "default"}
                                                    onClick={() => onSelectDemo(demo)}
                                                    disabled={isRunning}
                                                    width="100%"
                                                >
                                                    <Box width="100%">
                                                        <Text bold={isSelected || isCurrentDemo}>
                                                            {demo.name || 'Unnamed Demo'}
                                                        </Text>
                                                        {isCurrentDemo && (
                                                            <Badge variant="info" size="sm">Running</Badge>
                                                        )}
                                                    </Box>
                                                </Button>

                                                {showDescriptions && isExpanded && (
                                                    <Box marginLeft={1} marginBottom={0}>
                                                        <Text color={theme.colors.textMuted} wrap="wrap">
                                                            {demo.description}
                                                        </Text>
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    );
                })}

                {/* Summary */}
                <Box marginTop={1} borderStyle="single" borderColor={theme.colors.border} padding={0}>
                    <Text color={theme.colors.textMuted}>
                        📊 {Object.values(demos).flat().length} total demos across {categories.length} categories
                    </Text>
                </Box>
            </ScrollableArea>
        </Panel>
    );
};

// Enhanced Demo Output Component with better scrolling and educational features
const DemoOutput = ({output, isRunning, demoName}) => {
    const [autoScroll, setAutoScroll] = useState(true);
    const [showHelp, setShowHelp] = useState(false);

    useInput((input, key) => {
        if (input === 's') {
            setAutoScroll(!autoScroll);
        } else if (input === 'h') {
            setShowHelp(!showHelp);
        }
    });

    return (
        <Panel title={`🎯 Demo Output${demoName ? ` - ${demoName}` : ''}`} variant="default">
            <Box marginBottom={0}>
                <Flex justifyContent="space-between" alignItems="center">
                    <Text color={theme.colors.textMuted}>
                        📜 Output • 's': auto-scroll • 'h': help
                    </Text>
                    {isRunning && (
                        <Badge variant="warning" size="sm">
                            🔄 Running
                        </Badge>
                    )}
                    {autoScroll ? (
                        <Badge variant="success" size="sm">Auto-scroll ON</Badge>
                    ) : (
                        <Badge variant="secondary" size="sm">Auto-scroll OFF</Badge>
                    )}
                </Flex>
            </Box>

            <ScrollableArea height="100%">
                {output.length === 0 ? (
                    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                        <Text color={theme.colors.textMuted} dimColor>
                            {isRunning ? (
                                <>
                                    🚀 Demo is running...
                                    {'\n'}📊 Output will appear here as the demo executes
                                    {'\n'}⏳ This may take a few moments depending on the demo complexity
                                    {'\n'}
                                    {'\n'}💡 Educational Content:
                                    {'\n'} • Each demo provides hands-on learning
                                    {'\n'} • Watch for step-by-step explanations
                                    {'\n'} • Observe real-time system behavior
                                    {'\n'} • Learn by seeing concepts in action
                                </>
                            ) : (
                                <>
                                    👈 Select a demo from the sidebar to begin learning
                                    {'\n'}
                                    {'\n'}🎓 Learning Path Suggestions:
                                    {'\n'} • Start with "Core Reasoning" category
                                    {'\n'} • Try "basic-demo" for fundamentals
                                    {'\n'} • Explore different categories progressively
                                    {'\n'} • Each demo builds on previous knowledge
                                </>
                            )}
                        </Text>
                    </Box>
                ) : (
                    <Box flexDirection="column">
                        <Text>{output}</Text>

                        {/* Educational footer when not running */}
                        {!isRunning && output.length > 0 && (
                            <Box marginTop={1} borderStyle="single" borderColor={theme.colors.border} padding={1}>
                                <Text color={theme.colors.textMuted}>
                                    🎓 Learning Complete! Key takeaways from this demo:
                                    {'\n'} • Concepts demonstrated in real-time
                                    {'\n'} • System behavior observed directly
                                    {'\n'} • Interactive learning experience
                                    {'\n'}
                                    {'\n'}💡 Next Steps:
                                    {'\n'} • Try related demos in the same category
                                    {'\n'} • Explore advanced topics in other categories
                                    {'\n'} • Review the output to understand patterns
                                    {'\n'} • Apply concepts to your own projects
                                </Text>
                            </Box>
                        )}
                    </Box>
                )}
            </ScrollableArea>
        </Panel>
    );
};

// Main Demo Runner Component
const DemoRunner = ({onExit}) => {
    const [demos, setDemos] = useState({});
    const [selectedDemo, setSelectedDemo] = useState(null);
    const [demoOutput, setDemoOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [currentDemoName, setCurrentDemoName] = useState('');
    const [demoStats, setDemoStats] = useState({totalDemos: 0, categories: 0});

    // Load demos on component mount
    useEffect(() => {
        const categorizedDemos = getDemoFiles();
        console.log('Setting demos state with:', Object.keys(categorizedDemos));
        setDemos(categorizedDemos);

        // Calculate and set stats immediately
        const totalDemos = Object.values(categorizedDemos).reduce((acc, categoryDemos) => acc + categoryDemos.length, 0);
        const categories = Object.keys(categorizedDemos).length;
        console.log('Setting demoStats:', {totalDemos, categories});
        setDemoStats({totalDemos, categories});

        console.log('Demos state should now be updated');
    }, []);

    const handleSelectDemo = useCallback((demo) => {
        if (isRunning) return;

        setSelectedDemo(demo);
        setDemoOutput('');
        setCurrentDemoName(demo.name);
        setIsRunning(true);

        runDemo(
            demo.path,
            (output) => setDemoOutput(prev => prev + output),
            (fullOutput) => {
                setIsRunning(false);
                if (fullOutput) {
                    setDemoOutput(prev => prev + '\n🎉 Demo execution completed!');
                }
            }
        );
    }, [isRunning]);

    const handleStopDemo = useCallback(() => {
        setIsRunning(false);
        setDemoOutput(prev => prev + '\n⏹️  Demo stopped by user.\n');
    }, []);

    useInput((input, key) => {
        if (key.ctrl && input === 'c') {
            if (isRunning) {
                handleStopDemo();
            } else {
                onExit && onExit();
            }
        }
    });

    return (
        <Container flexDirection="column" width="100%">
            {/* Header */}
            <Card variant="primary" padding={theme.spacing.md} marginBottom={theme.spacing.sm}>
                <Flex justifyContent="space-between" alignItems="center">
                    <Box flexDirection="column">
                        <Flex alignItems="center" gap={theme.spacing.sm}>
                            <Text bold color={theme.colors.primary}>🎓 SeNARS Demo Runner</Text>
                            <Badge variant="info">TUI</Badge>
                        </Flex>
                        <Text color={theme.colors.textMuted}>
                            Interactive educational demos for the SeNARS cognitive system
                        </Text>
                    </Box>
                    <Box flexDirection="column" alignItems="flex-end">
                        <Flex alignItems="center" gap={theme.spacing.sm}>
                            <Badge variant="success">
                                {demoStats.totalDemos} demos • {demoStats.categories} categories
                            </Badge>
                            {isRunning && (
                                <Badge variant="warning">Running</Badge>
                            )}
                        </Flex>
                        <Text color={theme.colors.textMuted}>
                            {isRunning ? 'Press Ctrl+C to stop' : 'Press Ctrl+C to exit • ↑↓ to navigate • Enter to run'}
                        </Text>
                    </Box>
                </Flex>
            </Card>

            {/* Main Content - Making sidebar narrower to give more space to output */}
            <MainLayout showSidebar={true} sidebarWidth={30} adaptive={true}>
                {/* Demo List Sidebar */}
                <DemoList
                    demos={demos}
                    selectedDemo={selectedDemo}
                    onSelectDemo={handleSelectDemo}
                    isRunning={isRunning}
                />

                {/* Demo Output Area */}
                <DemoOutput
                    output={demoOutput}
                    isRunning={isRunning}
                    demoName={currentDemoName}
                />
            </MainLayout>
        </Container>
    );
};

export default DemoRunner;