import { useState, useCallback, useEffect, useRef } from 'react';
import { useInput, useStdin } from 'ink';

// Enhanced mouse interaction hook with hover, focus, and keyboard support
export const useMouseInteraction = (options = {}) => {
  const {
    onClick,
    onHover,
    onFocus,
    onBlur,
    disabled = false,
    enableKeyboard = true,
    enableMouse = true,
  } = options;

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const hoverTimeoutRef = useRef(null);

  // Handle mouse events with proper detection
  const handleMouseEnter = useCallback(() => {
    if (disabled || !enableMouse) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
    onHover?.(true);
  }, [disabled, enableMouse, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || !enableMouse) return;
    // Delay to prevent flickering during rapid mouse movements
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setIsActive(false);
      onHover?.(false);
    }, 50);
  }, [disabled, enableMouse, onHover]);

  const handleClick = useCallback((event) => {
    if (disabled || !enableMouse) return;
    setIsActive(true);
    onClick?.(event);
    // Reset active state after animation
    setTimeout(() => setIsActive(false), 150);
  }, [disabled, enableMouse, onClick]);

  // Handle keyboard events
  const handleFocus = useCallback(() => {
    if (disabled || !enableKeyboard) return;
    setIsFocused(true);
    onFocus?.();
  }, [disabled, enableKeyboard, onFocus]);

  const handleBlur = useCallback(() => {
    if (disabled || !enableKeyboard) return;
    setIsFocused(false);
    setIsActive(false);
    onBlur?.();
  }, [disabled, enableKeyboard, onBlur]);

  // Enhanced keyboard interaction support
  useInput((input, key) => {
    if (disabled || !enableKeyboard || !isFocused) return;

    if (key.return || key.space) {
      handleClick();
    } else if (key.escape) {
      handleBlur();
    }
  }, { isActive: isFocused });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return {
    isHovered,
    isFocused,
    isActive,
    disabled,
    handlers: enableMouse ? {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
    } : {},
    focusHandlers: enableKeyboard ? {
      onFocus: handleFocus,
      onBlur: handleBlur,
    } : {},
    // Computed state for styling
    interactionState: {
      hovered: isHovered,
      focused: isFocused,
      active: isActive,
      disabled,
    },
  };
};

// Enhanced hook for tab navigation with mouse and keyboard support
export const useTabNavigation = (tabs, initialTab = 0) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [focusedTab, setFocusedTab] = useState(initialTab);

  // Memoize tab length to prevent dependency issues
  const tabLength = tabs?.length || 0;

  const selectTab = useCallback((tabIdOrIndex) => {
    if (typeof tabIdOrIndex === 'string') {
      // If it's a tab ID, find the index
      const index = tabs?.findIndex(tab => tab.id === tabIdOrIndex) ?? -1;
      if (index >= 0) {
        setActiveTab(index);
        setFocusedTab(index);
      }
    } else {
      // If it's an index
      const index = tabIdOrIndex;
      if (index >= 0 && index < tabLength) {
        setActiveTab(index);
        setFocusedTab(index);
      }
    }
  }, [tabs, tabLength]);

  const nextTab = useCallback(() => {
    setIsKeyboardMode(true);
    const next = (activeTab + 1) % tabLength;
    setActiveTab(next);
    setFocusedTab(next);
  }, [activeTab, tabLength]);

  const prevTab = useCallback(() => {
    setIsKeyboardMode(true);
    const prev = (activeTab - 1 + tabLength) % tabLength;
    setActiveTab(prev);
    setFocusedTab(prev);
  }, [activeTab, tabLength]);

  const focusNext = useCallback(() => {
    setFocusedTab(prev => (prev + 1) % tabLength);
  }, [tabLength]);

  const focusPrev = useCallback(() => {
    setFocusedTab(prev => (prev - 1 + tabLength) % tabLength);
  }, [tabLength]);

  // Enhanced keyboard navigation
  useInput((input, key) => {
    const isTabNavigation = key.tab || key.rightArrow || key.leftArrow ||
                           input === 'l' || input === 'h' ||
                           (input >= '1' && input <= '9');

    if (!isTabNavigation) return;

    if (key.rightArrow || input === 'l' || key.tab) {
      nextTab();
    } else if (key.leftArrow || input === 'h') {
      prevTab();
    } else if (input >= '1' && input <= '9') {
      const index = parseInt(input) - 1;
      if (index < tabLength) {
        selectTab(index);
      }
    }
  });

  return {
    activeTab,
    focusedTab,
    selectTab,
    nextTab,
    prevTab,
    focusNext,
    focusPrev,
    isKeyboardMode,
    tabs,
  };
};

// Enhanced global focus management system
export const useFocusManager = () => {
  const [focusStack, setFocusStack] = useState([]);
  const [globalFocusOrder, setGlobalFocusOrder] = useState([]);

  const pushFocus = useCallback((elementId) => {
    setFocusStack(prev => [...prev, elementId]);
  }, []);

  const popFocus = useCallback(() => {
    setFocusStack(prev => prev.slice(0, -1));
  }, []);

  const clearFocus = useCallback(() => {
    setFocusStack([]);
  }, []);

  const currentFocus = focusStack[focusStack.length - 1];

  const registerFocusable = useCallback((elementId, metadata = {}) => {
    setGlobalFocusOrder(prev => {
      const existing = prev.find(item => item.id === elementId);
      if (existing) {
        return prev.map(item =>
          item.id === elementId ? { ...item, ...metadata } : item
        );
      }
      return [...prev, { id: elementId, ...metadata }];
    });
  }, []);

  const unregisterFocusable = useCallback((elementId) => {
    setGlobalFocusOrder(prev => prev.filter(item => item.id !== elementId));
  }, []);

  const focusNext = useCallback(() => {
    if (globalFocusOrder.length === 0) return null;

    const currentIndex = currentFocus
      ? globalFocusOrder.findIndex(item => item.id === currentFocus)
      : -1;

    const nextIndex = (currentIndex + 1) % globalFocusOrder.length;
    const nextElement = globalFocusOrder[nextIndex];

    if (nextElement) {
      pushFocus(nextElement.id);
      return nextElement;
    }
    return null;
  }, [currentFocus, globalFocusOrder, pushFocus]);

  const focusPrev = useCallback(() => {
    if (globalFocusOrder.length === 0) return null;

    const currentIndex = currentFocus
      ? globalFocusOrder.findIndex(item => item.id === currentFocus)
      : -1;

    const prevIndex = currentIndex <= 0 ? globalFocusOrder.length - 1 : currentIndex - 1;
    const prevElement = globalFocusOrder[prevIndex];

    if (prevElement) {
      pushFocus(prevElement.id);
      return prevElement;
    }
    return null;
  }, [currentFocus, globalFocusOrder, pushFocus]);

  return {
    pushFocus,
    popFocus,
    clearFocus,
    currentFocus,
    focusStack,
    registerFocusable,
    unregisterFocusable,
    focusNext,
    focusPrev,
    focusOrder: globalFocusOrder,
  };
};