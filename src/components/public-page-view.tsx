// @/src/components/public-page-view.tsx
import { AppFooter } from "./app-footer";
import Link from 'next/link';
import { Button } from './ui/button';

export function PublicPageView({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
       <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
            <div className="flex items-center gap-3">
                 <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))" />
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" />
                </svg>
                <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                    <Link href="/login">
                        Acessar a Plataforma
                    </Link>
                </Button>
            </div>
        </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}