// @/components/theme-loader.tsx
'use client';

import { useEffect, useState } from 'react';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ThemeSettings } from '@/lib/types';

// Function to generate a reasonable dark theme from a light theme HSL string
const generateDarkVariant = (hsl: string): string => {
    if (!hsl) return "";
    const [h, s, l] = hsl.replace(/%/g, '').split(' ').map(Number);
    if (isNaN(h) || isNaN(s) || isNaN(l)) return hsl;

    // Adjust lightness for dark mode. This is a heuristic.
    // Make dark backgrounds darker, and light text lighter.
    const newL = l > 50 ? 100 - l + 10 : l + 50;
    const newS = s > 30 ? s - 10 : s;

    return `${h} ${Math.max(0, newS)}% ${Math.min(100, newL)}%`;
};

const ThemeInjector = ({ theme }: { theme: ThemeSettings | null }) => {
  if (!theme) return null;

  const styleString = `
    :root {
      --custom-background: hsl(${theme.background});
      --custom-foreground: hsl(${theme.foreground});
      --custom-card: hsl(${theme.card});
      --custom-card-foreground: hsl(${theme.foreground});
      --custom-popover: hsl(${theme.card});
      --custom-popover-foreground: hsl(${theme.foreground});
      --custom-primary: hsl(${theme.primary});
      --custom-primary-foreground: hsl(0 0% 98%);
      --custom-secondary: hsl(${theme.secondary});
      --custom-secondary-foreground: hsl(${theme.foreground});
      --custom-muted: hsl(${theme.secondary});
      --custom-muted-foreground: hsl(${theme.foreground} / 0.6);
      --custom-accent: hsl(${theme.accent});
      --custom-accent-foreground: hsl(0 0% 98%);
      --custom-destructive: hsl(${theme.destructive});
      --custom-destructive-foreground: hsl(0 0% 98%);
      --custom-border: hsl(${theme.background} / 0.1);
      --custom-input: hsl(${theme.background} / 0.1);
      --custom-ring: hsl(${theme.primary});
    }
    .dark {
      --custom-dark-background: hsl(${generateDarkVariant(theme.background)});
      --custom-dark-foreground: hsl(${generateDarkVariant(theme.foreground)});
      --custom-dark-card: hsl(${generateDarkVariant(theme.background)});
      --custom-dark-card-foreground: hsl(${generateDarkVariant(theme.foreground)});
      --custom-dark-popover: hsl(${generateDarkVariant(theme.background)});
      --custom-dark-popover-foreground: hsl(${generateDarkVariant(theme.foreground)});
      --custom-dark-primary: hsl(${generateDarkVariant(theme.primary)});
      --custom-dark-primary-foreground: hsl(0 0% 98%);
      --custom-dark-secondary: hsl(${generateDarkVariant(theme.secondary)});
      --custom-dark-secondary-foreground: hsl(${generateDarkVariant(theme.foreground)});
      --custom-dark-muted: hsl(${generateDarkVariant(theme.secondary)});
      --custom-dark-muted-foreground: hsl(${generateDarkVariant(theme.foreground)} / 0.6);
      --custom-dark-accent: hsl(${generateDarkVariant(theme.accent)});
      --custom-dark-accent-foreground: hsl(0 0% 98%);
      --custom-dark-destructive: hsl(${generateDarkVariant(theme.destructive)});
      --custom-dark-destructive-foreground: hsl(0 0% 98%);
      --custom-dark-border: hsl(${generateDarkVariant(theme.background)} / 0.9);
      --custom-dark-input: hsl(${generateDarkVariant(theme.background)} / 0.9);
      --custom-dark-ring: hsl(${generateDarkVariant(theme.primary)});
    }
  `;

  return (
    <style id="custom-theme-styles" dangerouslySetInnerHTML={{ __html: styleString }} />
  );
};


const ThemeLoader = () => {
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  
  useEffect(() => {
    const fetchAndApplyTheme = async () => {
      try {
        const savedTheme = await firestoreApi.getThemeSettings();
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.warn("Could not fetch custom theme settings. Falling back to default theme.", error);
      }
    };

    fetchAndApplyTheme();
  }, []);

  return <ThemeInjector theme={theme} />;
};

export default ThemeLoader;
