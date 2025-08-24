// @/src/lib/icons.ts
'use client';

import { DollarSign, Users, Clapperboard, FileSpreadsheet, TrendingUp, BarChart, LayoutDashboard, Camera, Film, Video, Mic, Projector, Folder } from 'lucide-react';
import React from 'react';

// Icons for Login Page Features - Can be expanded
export const featureIcons: Record<string, React.ReactElement> = {
  DollarSign: <DollarSign />,
  Users: <Users />,
  Clapperboard: <Clapperboard />,
  FileSpreadsheet: <FileSpreadsheet />,
  TrendingUp: <TrendingUp />,
  BarChart: <BarChart />,
  LayoutDashboard: <LayoutDashboard />,
};
export type FeatureIconName = keyof typeof featureIcons;
