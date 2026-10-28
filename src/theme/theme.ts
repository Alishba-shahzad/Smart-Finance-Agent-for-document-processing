import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * Material UI Theme Configuration
 * Tailored for 'Smart Conversational Agent for Financial Document Processing'
 * Professional financial color palette with clean corporate aesthetics and high contrast readability.
 */
let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0F172A', // Slate 900 - authoritative primary
      light: '#334155', // Slate 700
      dark: '#020617', // Slate 950
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1a56db', // Blue 600 - subtle enterprise blue accent
      light: '#3b82f6',
      dark: '#1545b0',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#059669', // Emerald 600 - financial gain/positive indicators
      light: '#34D399',
      dark: '#047857',
    },
    warning: {
      main: '#D97706', // Amber 600 - alerts/pending reviews
      light: '#FBBF24',
      dark: '#B45309',
    },
    error: {
      main: '#DC2626', // Red 600 - discrepancies/errors
      light: '#F87171',
      dark: '#B91C1C',
    },
    info: {
      main: '#0284C7', // Sky 600 - information notes
      light: '#38BDF8',
      dark: '#0369A1',
    },
    background: {
      default: '#F8FAFC', // Slate 50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A', // Slate 900
      secondary: '#475569', // Slate 600
      disabled: '#94A3B8', // Slate 400
    },
    divider: '#E2E8F0', // Slate 200
  },
  typography: {
    fontFamily: [
      'var(--font-geist-sans)',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.25,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.35,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.45,
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#475569',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      color: '#64748B',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
      color: '#475569',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          padding: '8px 16px',
          fontWeight: 600,
          '&:hover': {
            boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F1F5F9',
          color: '#1E293B',
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export default theme;
