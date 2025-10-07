import React, {memo, useMemo, useState} from 'react';
import {Box, Text} from 'ink';
import {useMouseInteraction} from '../hooks/useMouseInteraction.js';
import {createFocusRing, createHoverEffect, theme} from '../theme.js';

// Modern interactive components with enhanced UX
export const Button = memo(({
                                children,
                                onClick,
                                variant = 'primary',
                                size = 'md',
                                disabled = false,
                                fullWidth = false,
                                ...props
                            }) => {
    const {interactionState, handlers, focusHandlers} = useMouseInteraction({
        onClick,
        disabled,
    });

    // Memoize variants and sizes to prevent recreation on every render
    const variants = useMemo(() => ({
        primary: {
            normal: theme.colors.primary,
            hover: theme.colors.hover,
            active: theme.colors.active,
        },
        secondary: {
            normal: theme.colors.secondary,
            hover: theme.colors.text,
            active: theme.colors.textMuted,
        },
        default: {
            normal: theme.colors.text,
            hover: theme.colors.text,
            active: theme.colors.textMuted,
        },
        success: {
            normal: theme.colors.success,
            hover: '#00E676',
            active: '#00C853',
        },
        warning: {
            normal: theme.colors.warning,
            hover: '#FF8F00',
            active: '#FF6F00',
        },
        error: {
            normal: theme.colors.error,
            hover: '#FF3742',
            active: '#D32F2F',
        },
        info: {
            normal: theme.colors.info,
            hover: '#74B9FF',
            active: '#0984E3',
        },
    }), []);

    const sizes = useMemo(() => ({
        sm: {paddingX: 1, paddingY: 0},
        md: {paddingX: 2, paddingY: 1},
        lg: {paddingX: 3, paddingY: 1},
    }), []);

    // Memoize current color calculation
    const currentColor = useMemo(() =>
            interactionState.disabled
                ? theme.colors.textMuted
                : interactionState.active
                    ? variants[variant].active
                    : interactionState.hovered
                        ? variants[variant].hover
                        : variants[variant].normal,
        [interactionState.disabled, interactionState.active, interactionState.hovered, variant, variants]
    );

    return (
        <Box
            {...handlers}
            {...focusHandlers}
            {...createFocusRing(interactionState.focused)}
            {...createHoverEffect(interactionState.hovered)}
            paddingX={sizes[size].paddingX}
            paddingY={sizes[size].paddingY}
            marginX={0}
            {...props}
        >
            <Text
                color={currentColor}
                bold={!interactionState.disabled}
                dimColor={interactionState.disabled}
            >
                {interactionState.disabled ? '○' : '●'} {children}
            </Text>
        </Box>
    );
});

export const Tab = memo(({
                             children,
                             isActive = false,
                             isFocused = false,
                             onClick,
                             disabled = false,
                             ...props
                         }) => {
    const {interactionState, handlers, focusHandlers} = useMouseInteraction({
        onClick,
        disabled,
    });

    // Memoize color calculation
    const color = useMemo(() =>
            interactionState.disabled
                ? theme.colors.textMuted
                : isActive
                    ? theme.colors.primary
                    : isFocused
                        ? theme.colors.accent
                        : interactionState.hovered
                            ? theme.colors.text
                            : theme.colors.textMuted,
        [interactionState.disabled, isActive, isFocused, interactionState.hovered]
    );

    return (
        <Box
            {...handlers}
            {...focusHandlers}
            {...createFocusRing(isFocused || interactionState.focused)}
            {...createHoverEffect(interactionState.hovered)}
            paddingX={theme.spacing.sm}
            paddingY={0}
            {...props}
        >
            <Text
                color={color}
                bold={isActive}
                underline={isActive}
                dimColor={interactionState.disabled}
            >
                {isFocused ? '▶ ' : ''}{children}
            </Text>
        </Box>
    );
});

export const TabBar = memo(({
                                tabs,
                                activeTab,
                                focusedTab,
                                onTabChange,
                                ...props
                            }) => (
    <Box {...props}>
        {tabs.map((tab, index) => (
            <Tab
                key={index}
                isActive={activeTab === index}
                isFocused={focusedTab === index}
                onClick={() => onTabChange(index)}
                marginRight={index < tabs.length - 1 ? theme.spacing.md : 0}
            >
                {tab.label}
            </Tab>
        ))}
    </Box>
));

export const Card = memo(({
                              children,
                              title,
                              actions,
                              variant = 'default',
                              padding = theme.spacing.md,
                              ...props
                          }) => {
    // Memoize card styles
    const cardStyles = useMemo(() => ({
        default: {
            borderColor: theme.colors.border,
        },
        primary: {
            borderColor: theme.colors.primary,
        },
        success: {
            borderColor: theme.colors.success,
        },
        warning: {
            borderColor: theme.colors.warning,
        },
        error: {
            borderColor: theme.colors.error,
        },
    }), []);

    return (
        <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={cardStyles[variant].borderColor}
            padding={padding}
            {...props}
        >
            {(title || actions) && (
                <Box
                    justifyContent="space-between"
                    alignItems="center"
                    marginBottom={children ? theme.spacing.sm : 0}
                >
                    {title && (
                        <Text bold color={theme.colors.primary}>
                            {title}
                        </Text>
                    )}
                    {actions && (
                        <Box>
                            {actions}
                        </Box>
                    )}
                </Box>
            )}
            {children}
        </Box>
    );
});

export const Badge = memo(({
                               children,
                               variant = 'info',
                               size = 'sm',
                               ...props
                           }) => {
    // Memoize variants and sizes
    const variants = useMemo(() => ({
        info: theme.colors.info,
        success: theme.colors.success,
        warning: theme.colors.warning,
        error: theme.colors.error,
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        default: theme.colors.text,
    }), []);

    const sizes = useMemo(() => ({
        sm: {paddingX: 1, paddingY: 0},
        md: {paddingX: 2, paddingY: 0},
    }), []);

    return (
        <Box
            paddingX={sizes[size].paddingX}
            paddingY={sizes[size].paddingY}
            backgroundColor={variants[variant]}
            {...props}
        >
            <Text color={theme.colors.background} bold>
                {children}
            </Text>
        </Box>
    );
});

export const ProgressBar = memo(({
                                     progress,
                                     max = 100,
                                     width = 20,
                                     showPercentage = true,
                                     color = theme.colors.primary,
                                     ...props
                                 }) => {
    // Memoize progress calculations
    const {percentage, filledWidth, emptyWidth} = useMemo(() => {
        const pct = Math.min(Math.max((progress / max) * 100, 0), 100);
        const filled = Math.floor((pct / 100) * width);
        const empty = width - filled;
        return {percentage: pct, filledWidth: filled, emptyWidth: empty};
    }, [progress, max, width]);

    return (
        <Box {...props}>
            <Text>
                {'█'.repeat(filledWidth)}
                {'░'.repeat(emptyWidth)}
                {showPercentage && (
                    <Text color={theme.colors.textMuted}>
                        {' ' + percentage.toFixed(0) + '%'}
                    </Text>
                )}
            </Text>
        </Box>
    );
});

export const Tooltip = memo(({
                                 children,
                                 content,
                                 position = 'top',
                                 ...props
                             }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <Box
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            {...props}
        >
            {children}
            {isVisible && (
                <Box position="absolute" marginTop={-1}>
                    <Text color={theme.colors.textMuted} backgroundColor={theme.colors.surface}>
                        {' ' + content + ' '}
                    </Text>
                </Box>
            )}
        </Box>
    );
});