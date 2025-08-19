
'use client';

import { DollarSign, Users, Clapperboard, FileSpreadsheet, TrendingUp, BarChart, LayoutDashboard } from 'lucide-react';
import React from 'react';

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
