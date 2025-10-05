// Modern professional theme for SeNARS TUI
export const theme = {
  colors: {
    // Primary brand colors
    primary: '#00D4FF',      // Electric cyan
    secondary: '#7B68EE',    // Medium slate blue
    accent: '#FF6B6B',       // Soft coral

    // Status colors
    success: '#00FF88',      // Bright mint green
    warning: '#FFD700',      // Gold
    error: '#FF4757',        // Soft red
    info: '#74B9FF',         // Sky blue

    // Neutral colors
    background: '#0A0A1A',   // Rich dark navy
    surface: '#16162E',      // Elevated surface
    surfaceAlt: '#1C1C3A',   // Alternative surface
    border: '#2A2A4A',       // Subtle border
    text: '#F0F0F8',         // Crisp white text
    textMuted: '#B8B8D8',    // Muted text
    textDim: '#7878A0',      // Dim text

    // Interactive states
    hover: '#00B8E6',        // Enhanced hover cyan
    active: '#0092CC',       // Active state
    focus: '#00D4FF',        // Bright focus ring

    // Agent states
    agentIdle: '#606078',    // Neutral idle state
    agentActive: '#00FF88',  // Vibrant active green
    agentBusy: '#FFD700',    // Bright gold for busy
    agentError: '#FF4757',   // Clear error red
  },

  spacing: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 6,
    xxl: 8,
  },

  borderRadius: {
    sm: 1,
    md: 2,
    lg: 3,
  },

  typography: {
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
    },
    fontWeight: {
      normal: 'normal',
      bold: 'bold',
    },
  },

  shadows: {
    sm: 'inset 0 1px 0 rgba(255,255,255,0.1)',
    md: 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
    lg: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3)',
  },

  gradients: {
    primary: ['#00D4FF', '#7B68EE'],
    success: ['#00FF88', '#00D4FF'],
    warning: ['#FFD700', '#FF6B6B'],
    error: ['#FF4757', '#7B68EE'],
  }
};

// Helper function to get themed colors
export const getThemedColor = (colorKey, variant = 'normal') => {
  const color = theme.colors[colorKey];
  if (typeof color === 'string') return color;

  return color[variant] || color;
};

// Component styling helpers
export const createStyledBorder = (color = theme.colors.border, style = 'single') => ({
  borderStyle: style,
  borderColor: color,
});

export const createFocusRing = (isFocused = false) => ({
  borderColor: isFocused ? theme.colors.focus : theme.colors.border,
  borderStyle: 'single',
});

export const createHoverEffect = (isHovered = false) => ({
  backgroundColor: isHovered ? theme.colors.surfaceAlt : 'transparent',
});