import React, {memo, useEffect, useMemo, useState} from 'react';
import {Box, Text, useStdin} from 'ink';
import {createStyledBorder, theme} from '../theme.js';

// Optimized screen size detection hook with memoization
const useScreenSize = () => {
    const {stdout} = useStdin();
    const [dimensions, setDimensions] = useState({
        width: 140,
        height: 35
    });

    useEffect(() => {
        if (stdout && typeof stdout.columns === 'number' && typeof stdout.rows === 'number') {
            setDimensions({
                width: stdout.columns,
                height: stdout.rows
            });
        }
    }, [stdout]);

    // Memoize screen size calculations to prevent unnecessary recalculations
    const screenSize = useMemo(() => {
        const {width, height} = dimensions;
        return {
            width,
            height,
            isSmall: width < 80,
            isMedium: width >= 80 && width < 120,
            isLarge: width >= 120
        };
    }, [dimensions]);

    return screenSize;
};

// Modern layout components with responsive design - optimized with memoization
export const Container = memo(({
                                   children,
                                   padding = theme.spacing.md,
                                   margin = 0,
                                   flexDirection = 'column',
                                   width = '100%',
                                   height = 'auto',
                                   responsive = true,
                                   ...props
                               }) => {
    const screenSize = useScreenSize();

    // Memoize responsive padding calculation
    const responsivePadding = useMemo(() =>
            responsive ? (
                screenSize.isSmall ? theme.spacing.sm :
                    screenSize.isLarge ? theme.spacing.lg : padding
            ) : padding,
        [responsive, screenSize.isSmall, screenSize.isLarge, padding]
    );

    return (
        <Box
            flexDirection={flexDirection}
            width={width}
            height={height}
            padding={responsivePadding}
            margin={margin}
            {...props}
        >
            {children}
        </Box>
    );
});

export const Panel = memo(({
                               children,
                               title,
                               width = '100%',
                               height = 'auto',
                               variant = 'default',
                               ...props
                           }) => {
    // Memoize panel styles to prevent recreation on every render
    const panelStyles = useMemo(() => ({
        default: {
            borderStyle: 'single',
            borderColor: theme.colors.border,
        },
        primary: {
            borderStyle: 'double',
            borderColor: theme.colors.primary,
        },
        success: {
            borderStyle: 'single',
            borderColor: theme.colors.success,
        },
        warning: {
            borderStyle: 'single',
            borderColor: theme.colors.warning,
        },
        error: {
            borderStyle: 'single',
            borderColor: theme.colors.error,
        },
    }), []);

    return (
        <Box
            flexDirection="column"
            width={width}
            height={height}
            {...panelStyles[variant]}
            {...props}
        >
            {title && (
                <Box padding={theme.spacing.sm} {...createStyledBorder()}>
                    <Box marginRight={theme.spacing.sm}>
                        <Text color={theme.colors.primary} bold>
                            {title}
                        </Text>
                    </Box>
                </Box>
            )}
            <Box flexDirection="column" flexGrow={1} padding={theme.spacing.sm}>
                {children}
            </Box>
        </Box>
    );
});

export const Flex = memo(({
                              children,
                              justifyContent = 'flex-start',
                              alignItems = 'flex-start',
                              gap = 0,
                              wrap = false,
                              ...props
                          }) => (
    <Box
        justifyContent={justifyContent}
        alignItems={alignItems}
        gap={gap}
        flexWrap={wrap ? 'wrap' : 'nowrap'}
        {...props}
    >
        {children}
    </Box>
));

export const Grid = memo(({
                              children,
                              columns = 2,
                              gap = theme.spacing.sm,
                              ...props
                          }) => {
    // Memoize column width calculation
    const columnWidth = useMemo(() => `${Math.floor(100 / columns)}%`, [columns]);

    return (
        <Box
            flexDirection="row"
            flexWrap="wrap"
            gap={gap}
            {...props}
        >
            {React.Children.map(children, (child, index) => (
                <Box key={index} width={columnWidth}>
                    {child}
                </Box>
            ))}
        </Box>
    );
});

export const ScrollableArea = memo(({
                                        children,
                                        height = 10,
                                        scrollIndicator = true,
                                        ...props
                                    }) => (
    <Box
        flexDirection="column"
        height={height}
        {...props}
    >
        {scrollIndicator && (
            <Box paddingX={1}>
                <Text color={theme.colors.textMuted} dimColor>
                    ↑↓ Scroll • Page Up/Down
                </Text>
            </Box>
        )}
        <Box flexDirection="column" flexGrow={1}>
            {children}
        </Box>
    </Box>
));

export const SplitPane = memo(({
                                   children,
                                   direction = 'row',
                                   defaultSplit = 50,
                                   minSize = 20,
                                   responsive = true,
                                   adaptive = true,
                                   ...props
                               }) => {
    const screenSize = useScreenSize();
    const [splitPercentage, setSplitPercentage] = React.useState(defaultSplit);

    // Memoize adaptive split calculation
    const adaptiveSplit = useMemo(() => {
        if (!responsive || !adaptive) return splitPercentage;

        if (screenSize.isSmall) {
            return direction === 'row' ? 100 : splitPercentage;
        } else if (screenSize.isLarge) {
            return direction === 'row' ? 70 : splitPercentage;
        }
        return splitPercentage;
    }, [responsive, adaptive, screenSize.isSmall, screenSize.isLarge, splitPercentage, direction]);

    const currentSplit = responsive ? adaptiveSplit : splitPercentage;

    // Memoize box dimensions
    const firstChildDimensions = useMemo(() => ({
        width: direction === 'row' ? `${currentSplit}%` : '100%',
        height: direction === 'column' ? `${currentSplit}%` : '100%'
    }), [direction, currentSplit]);

    const secondChildDimensions = useMemo(() => ({
        width: direction === 'row' ? `${100 - currentSplit}%` : '100%',
        height: direction === 'column' ? `${100 - currentSplit}%` : '100%'
    }), [direction, currentSplit]);

    const borderStyle = useMemo(() =>
            screenSize.isSmall ? 'none' : 'single',
        [screenSize.isSmall]
    );

    return (
        <Box flexDirection={direction} {...props}>
            <Box {...firstChildDimensions}>
                {children[0]}
            </Box>
            <Box
                {...secondChildDimensions}
                borderStyle={borderStyle}
                borderColor={theme.colors.border}
            >
                {children[1]}
            </Box>
        </Box>
    );
});

// Responsive main layout for the TUI - optimized with memoization
export const MainLayout = memo(({
                                    children,
                                    showSidebar = true,
                                    sidebarWidth = 35,
                                    adaptive = true,
                                    ...props
                                }) => {
    const screenSize = useScreenSize();

    // Memoize sidebar visibility calculation
    const effectiveShowSidebar = useMemo(() =>
            showSidebar && !screenSize.isSmall,
        [showSidebar, screenSize.isSmall]
    );

    // Adaptive sidebar width based on screen size and content
    const sidebarWidthPercent = useMemo(() => {
        if (!adaptive) return `${sidebarWidth}%`;

        if (screenSize.isSmall) return '100%'; // Stack vertically on small screens
        if (screenSize.width < 100) return '45%'; // Narrower on medium-small
        if (screenSize.width < 140) return '40%'; // Standard on medium
        return '35%'; // More space for content on large screens
    }, [adaptive, sidebarWidth, screenSize.isSmall, screenSize.width]);

    // Adaptive spacing based on screen size
    const adaptiveSpacing = useMemo(() =>
            screenSize.isSmall ? theme.spacing.sm : theme.spacing.md,
        [screenSize.isSmall]
    );

    if (React.Children.count(children) !== 2) {
        return <Container {...props}>{children}</Container>;
    }

    const [mainContent, sidebarContent] = children;

    if (!effectiveShowSidebar) {
        return (
            <Container {...props}>
                {mainContent}
            </Container>
        );
    }

    // Use column layout on very small screens for better space utilization
    if (screenSize.isSmall) {
        return (
            <Container flexDirection="column" {...props}>
                <Box flexDirection="column" marginBottom={adaptiveSpacing}>
                    {mainContent}
                </Box>
                <Box flexDirection="column">
                    {sidebarContent}
                </Box>
            </Container>
        );
    }

    return (
        <Container flexDirection="row" {...props}>
            <Box flexDirection="column" flexGrow={1} minWidth={screenSize.isSmall ? '100%' : '60%'}>
                {mainContent}
            </Box>
            <Box
                flexDirection="column"
                width={sidebarWidthPercent}
                marginLeft={adaptiveSpacing}
                minWidth={20}
            >
                {sidebarContent}
            </Box>
        </Container>
    );
});

// Responsive grid that adapts to screen size - optimized with memoization
export const ResponsiveGrid = memo(({
                                        children,
                                        minItemWidth = 30,
                                        gap = theme.spacing.md,
                                        ...props
                                    }) => {
    const screenSize = useScreenSize();

    const itemsPerRow = useMemo(() => {
        if (screenSize.isSmall) return 1;
        if (screenSize.isMedium) return 2;
        return Math.floor(screenSize.width / (minItemWidth + gap));
    }, [screenSize.isSmall, screenSize.isMedium, screenSize.width, minItemWidth, gap]);

    const columnWidth = useMemo(() =>
            `${Math.floor(100 / itemsPerRow)}%`,
        [itemsPerRow]
    );

    return (
        <Box
            flexDirection="row"
            flexWrap="wrap"
            gap={gap}
            {...props}
        >
            {React.Children.map(children, (child, index) => (
                <Box key={index} width={columnWidth}>
                    {child}
                </Box>
            ))}
        </Box>
    );
});