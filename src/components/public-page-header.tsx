// @/src/components/public-page-header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import type { UserProfile } from "@/lib/types";

interface PublicPageHeaderProps {
  creator: UserProfile | null;
}

export function PublicPageHeader({ creator }: PublicPageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
      <div className="flex items-center gap-3">
        {creator && (
            <div className="flex items-center gap-2">
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={creator.photoURL || undefined} alt={creator.name || 'Avatar'} className="object-cover" />
                    <AvatarFallback>{creator.name ? getInitials(creator.name) : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-xs text-muted-foreground">Criado por</p>
                    <p className="text-sm font-semibold">{creator.name}</p>
                </div>
            </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
         <Button asChild variant="outline" size="sm">
            <Link href="/login">
                Feito com
                 <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1.5 mr-1">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))" />
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" />
                </svg>
                <span className="font-semibold" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</span>
            </Link>
        </Button>
      </div>
    </header>
  );
}
