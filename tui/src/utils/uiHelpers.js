import React from 'react';
import { theme } from '../theme.js';
import { TUI_CONSTANTS } from '../constants.js';

// Common log level definitions to eliminate duplication
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

export const LOG_LEVEL_CONFIG = {
  COLORS: {
    [LOG_LEVELS.ERROR]: theme.colors.error,
    [LOG_LEVELS.WARN]: theme.colors.warning,
    [LOG_LEVELS.INFO]: theme.colors.info,
    [LOG_LEVELS.DEBUG]: theme.colors.secondary,
  },
  NAMES: {
    [LOG_LEVELS.ERROR]: 'ERR',
    [LOG_LEVELS.WARN]: 'WRN',
    [LOG_LEVELS.INFO]: 'INF',
    [LOG_LEVELS.DEBUG]: 'DBG',
  },
  FULL_NAMES: {
    [LOG_LEVELS.ERROR]: 'ERROR',
    [LOG_LEVELS.WARN]: 'WARNING',
    [LOG_LEVELS.INFO]: 'INFO',
    [LOG_LEVELS.DEBUG]: 'DEBUG',
  }
};

// Utility functions for common UI operations

// Format numbers with proper units
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return 'N/A';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  } else {
    return num.toFixed(decimals);
  }
};

// Format memory size
export const formatMemory = (bytes) => {
  if (bytes === null || bytes === undefined) return 'N/A';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)}${units[unitIndex]}`;
};

// Format time duration
export const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return 'N/A';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Format percentage
export const formatPercentage = (value, total, decimals = 1) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Colorize log level
export const getLogLevelColor = (level) => {
  return LOG_LEVEL_CONFIG.COLORS[level] || theme.colors.text;
};

// Get log level name
export const getLogLevelName = (level) => {
  return LOG_LEVEL_CONFIG.NAMES[level] || 'UNK';
};

// Get full log level name
export const getLogLevelFullName = (level) => {
  return LOG_LEVEL_CONFIG.FULL_NAMES[level] || 'UNKNOWN';
};

// Debounce function for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for performance
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate unique IDs
export const generateId = (prefix = 'tui') => {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
};

// Deep clone objects (simple implementation)
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));

  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
};

// Safe JSON parse
export const safeJsonParse = (str, fallback = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// Format agent state for display
export const formatAgentState = (agentState) => {
  if (!agentState) return null;

  return {
    ...agentState,
    formattedUptime: formatDuration(agentState.uptime),
    formattedMemory: formatMemory(agentState.stats?.memoryUsedBytes),
    statusColor: agentState.isRunning ? theme.colors.success : theme.colors.warning,
    statusText: agentState.isRunning ? 'Running' : 'Idle'
  };
};

// Validate component props
export const validateProps = (props, schema) => {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = props[key];

    if (rules.required && (value === null || value === undefined)) {
      errors.push(`${key} is required`);
      continue;
    }

    if (value !== null && value !== undefined) {
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
      }

      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${key} format is invalid`);
      }
    }
  }

  return errors;
};

// Keyboard shortcuts helper
export const formatShortcut = (key) => {
  const shortcuts = {
    'return': 'Enter',
    'escape': 'Esc',
    'upArrow': '↑',
    'downArrow': '↓',
    'leftArrow': '←',
    'rightArrow': '→',
    'tab': 'Tab',
    'space': 'Space'
  };

  return shortcuts[key] || key.toUpperCase();
};

// Color utilities
export const lightenColor = (color, amount = 0.1) => {
  // Simple color lightening - in a real implementation you'd parse hex colors
  return color;
};

export const darkenColor = (color, amount = 0.1) => {
  // Simple color darkening - in a real implementation you'd parse hex colors
  return color;
};

// Animation helpers
export const createPulseAnimation = (colors, interval = 500) => {
  const [currentColor, setCurrentColor] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentColor(prev => (prev + 1) % colors.length);
    }, interval);

    return () => clearInterval(timer);
  }, [colors, interval]);

  return colors[currentColor];
};