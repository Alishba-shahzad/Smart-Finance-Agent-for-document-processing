'use client';

import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme/theme';

interface ThemeRegistryProps {
  children: React.ReactNode;
}

/**
 * ThemeRegistry wraps the application with:
 * 1. AppRouterCacheProvider (MUI SSR style extraction for Next.js App Router)
 *    Configured with `enableCssLayer: true` so MUI styles reside in `@layer mui`,
 *    allowing harmonious co-existence with Tailwind CSS utility classes.
 * 2. ThemeProvider with custom financial domain theme
 * 3. CssBaseline for unified baseline styling
 */
export default function ThemeRegistry({ children }: ThemeRegistryProps) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true, key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
