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
      <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
};
