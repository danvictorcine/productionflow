// @/components/theme-loader.tsx
'use client';

import { useEffect, useState } from 'react';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { ThemeSettings } from '@/lib/types';

// Inverte a luminosidade para o tema escuro, mantendo a saturação
const generateInverseVariant = (hsl: string): string => {
    if (!hsl) return "";
    const [h, s, l] = hsl.replace(/%/g, '').split(' ').map(Number);
    if (isNaN(h) || isNaN(s) || isNaN(l)) return hsl;

    // Simple lightness inversion
    const newL = 100 - l;
    return `${h} ${s}% ${newL}%`;
};

const ThemeInjector = ({ theme }: { theme: ThemeSettings | null }) => {
  if (!theme) return null;

  // Manter cores de ação (primary, accent, destructive) e gráficos.
  // Inverter cores neutras (background, foreground, card, border).
  const styleString = `
    :root {
      --background: ${theme.background};
      --foreground: ${theme.foreground};
      --card: ${theme.card};
      --card-foreground: ${theme.foreground};
      --popover: ${theme.card};
      --popover-foreground: ${theme.foreground};
      --primary: ${theme.primary};
      --primary-foreground: 0 0% 98%;
      --secondary: ${theme.secondary};
      --secondary-foreground: ${theme.foreground};
      --muted: ${theme.secondary};
      --muted-foreground: ${theme.foreground} / 0.6;
      --accent: ${theme.accent};
      --accent-foreground: 0 0% 98%;
      --destructive: ${theme.destructive};
      --destructive-foreground: 0 0% 98%;
      --border: ${theme.border};
      --input: ${theme.border};
      --ring: ${theme.primary};
      --chart-1: ${theme.chart1};
      --chart-2: ${theme.chart2};
      --chart-3: ${theme.chart3};
      --chart-4: ${theme.chart4};
      --chart-5: ${theme.chart5};
      --brand-icon: ${theme.brandIcon};
      --brand-text: ${theme.brandText};
      --brand-login: ${theme.brandLogin};
    }

    .dark {
      --background: ${generateInverseVariant(theme.background)};
      --foreground: ${generateInverseVariant(theme.foreground)};
      --card: ${generateInverseVariant(theme.card)};
      --card-foreground: ${generateInverseVariant(theme.foreground)};
      --popover: ${generateInverseVariant(theme.card)};
      --popover-foreground: ${generateInverseVariant(theme.foreground)};
      --primary: ${theme.primary};
      --primary-foreground: 0 0% 98%;
      --secondary: ${generateInverseVariant(theme.secondary)};
      --secondary-foreground: ${generateInverseVariant(theme.foreground)};
      --muted: ${generateInverseVariant(theme.secondary)};
      --muted-foreground: ${generateInverseVariant(theme.foreground)} / 0.6;
      --accent: ${theme.accent};
      --accent-foreground: 0 0% 98%;
      --destructive: ${theme.destructive};
      --destructive-foreground: 0 0% 98%;
      --border: ${generateInverseVariant(theme.border)};
      --input: ${generateInverseVariant(theme.border)};
      --ring: ${theme.primary};
      --chart-1: ${theme.chart1};
      --chart-2: ${theme.chart2};
      --chart-3: ${theme.chart3};
      --chart-4: ${theme.chart4};
      --chart-5: ${theme.chart5};
      --brand-icon: ${theme.brandIcon};
      --brand-text: ${generateInverseVariant(theme.brandText)};
      --brand-login: ${theme.brandLogin};
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
