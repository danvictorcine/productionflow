// @/src/lib/icons.ts
'use client';

import { DollarSign, Users, Clapperboard, FileSpreadsheet, TrendingUp, BarChart, LayoutDashboard, Camera, Film, Video, Mic, Projector, Folder } from 'lucide-react';
import React from 'react';
import Image from 'next/image';
import { cn } from './utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from './utils';

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


// Icons for Project Cards
export const projectIconMap: Record<string, React.ElementType> = {
  Folder,
  Camera,
  Clapperboard,
  Film,
  Video,
  Mic,
  Projector,
};
export type ProjectIconName = keyof typeof projectIconMap;

interface ProjectIconProps {
    iconName?: string | null;
    iconType?: 'lucide' | 'photo' | null;
    className?: string;
}

export const ProjectIcon: React.FC<ProjectIconProps> = ({ iconName, iconType, className }) => {
    if (iconType === 'photo' && iconName) {
        return (
            <div className={cn("relative h-full w-full", className)}>
                <Image src={iconName} alt="Ícone do projeto" layout="fill" objectFit="cover" className="rounded-full" />
            </div>
        );
    }
    
    const IconComponent = iconName && projectIconMap[iconName] ? projectIconMap[iconName] : Folder;
    
    return <IconComponent className={cn("h-6 w-6 text-primary", className)} />;
};
