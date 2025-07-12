// @/components/theme-loader.tsx
'use client';

import { useEffect, useState } from 'react';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ThemeSettings } from '@/lib/types';

// Function to generate a dark variant for background/foreground colors.
// It makes light colors dark, and dark colors light.
const generateInverseVariant = (hsl: string): string => {
    if (!hsl) return "";
    const [h, s, l] = hsl.replace(/%/g, '').split(' ').map(Number);
    if (isNaN(h) || isNaN(s) || isNaN(l)) return hsl;

    // A simple inversion of lightness.
    const newL = 100 - l;
    // Slightly desaturate to avoid overly vibrant dark backgrounds.
    const newS = Math.max(0, s - 10);

    return `${h} ${newS}% ${newL}%`;
};

const ThemeInjector = ({ theme }: { theme: ThemeSettings | null }) => {
  if (!theme) return null;

  const styleString = `
    :root {
      --background: ${theme.background};
      --foreground: ${theme.foreground};
      --card: ${theme.card};
      --card-foreground: ${theme.foreground};
      --popover: ${theme.card};
      --popover-foreground: ${theme.foreground};
      --primary: ${theme.primary};
      --primary-foreground: 0 0% 98%; /* Keep white/light text for buttons */
      --secondary: ${theme.secondary};
      --secondary-foreground: ${theme.foreground};
      --muted: ${theme.secondary};
      --muted-foreground: ${theme.foreground} / 0.6;
      --accent: ${theme.accent};
      --accent-foreground: 0 0% 98%; /* Keep white/light text */
      --destructive: ${theme.destructive};
      --destructive-foreground: 0 0% 98%; /* Keep white/light text */
      --border: ${theme.foreground} / 0.1;
      --input: ${theme.foreground} / 0.1;
      --ring: ${theme.primary};
    }

    .dark {
      --background: ${generateInverseVariant(theme.background)};
      --foreground: ${generateInverseVariant(theme.foreground)};
      --card: ${generateInverseVariant(theme.card)};
      --card-foreground: ${generateInverseVariant(theme.foreground)};
      --popover: ${generateInverseVariant(theme.card)};
      --popover-foreground: ${generateInverseVariant(theme.foreground)};
      --primary: ${theme.primary}; /* Keep same primary color */
      --primary-foreground: 0 0% 98%;
      --secondary: ${generateInverseVariant(theme.secondary)};
      --secondary-foreground: ${generateInverseVariant(theme.foreground)};
      --muted: ${generateInverseVariant(theme.secondary)};
      --muted-foreground: ${generateInverseVariant(theme.foreground)} / 0.6;
      --accent: ${theme.accent}; /* Keep same accent color */
      --accent-foreground: 0 0% 98%;
      --destructive: ${theme.destructive}; /* Keep same destructive color */
      --destructive-foreground: 0 0% 98%;
      --border: ${generateInverseVariant(theme.foreground)} / 0.1;
      --input: ${generateInverseVariant(theme.foreground)} / 0.1;
      --ring: ${theme.primary};
    }
  `;

  return (
    <style id="custom-theme-styles" dangerouslySetInnerHTML={{ __html: styleString.replace(/hsl\((.+?)\)/g, '$1') }} />
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
