// @/components/theme-loader.tsx
'use client';

import { useEffect } from 'react';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ThemeSettings } from '@/lib/types';

const applyThemeStyles = (theme: ThemeSettings) => {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    // Convert camelCase key to kebab-case for CSS variable names
    const cssVarName = `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    root.style.setProperty(cssVarName, value);
  });
};

const ThemeLoader = () => {
  useEffect(() => {
    const fetchAndApplyTheme = async () => {
      try {
        const theme = await firestoreApi.getThemeSettings();
        if (theme) {
          applyThemeStyles(theme);
        }
      } catch (error) {
        console.warn("Could not fetch custom theme settings. Falling back to default theme.", error);
      }
    };

    fetchAndApplyTheme();
  }, []);

  return null; // This component does not render anything
};

export default ThemeLoader;
