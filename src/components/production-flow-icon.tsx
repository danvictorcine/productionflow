// @/src/components/production-flow-icon.tsx
import React from 'react';
import { cn } from '@/lib/utils';

export const ProductionFlowIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      {...props}
    >
      <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))" />
      <path d="M10 8H13L16.5 16L13 24H10L13.5 16L10 8Z" fill="hsl(var(--primary-foreground))" opacity="0.7"/>
      <path d="M16 8H19L22.5 16L19 24H16L19.5 16L16 8Z" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
};
