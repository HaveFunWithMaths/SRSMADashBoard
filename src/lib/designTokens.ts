export const COLORS = {
  primary: '#1a365d',     // Navy Blue
  accent: '#d4942a',      // Saffron/Gold
  success: '#10b981',     // Emerald Green
  danger: '#ef4444',      // Red
  warning: '#f59e0b',     // Amber
  background: '#f8fafc',  // Slate 50
  surface: '#ffffff',     // White
  textMain: '#1e293b',    // Slate 800
  textMuted: '#64748b',   // Slate 500
  border: '#e2e8f0',      // Slate 200

  // Subject specific colors (sync with branding)
  subjects: {
    Maths: '#ef4444',     // Red
    Physics: '#3b82f6',   // Blue
    Chemistry: '#f59e0b', // Golden
    Total: '#8b5cf6',     // Violet
    default: '#64748b'    // Slate
  }
} as const;
