// @/src/components/app-footer.tsx
"use client";

import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="w-full border-t border-border/40 mt-auto bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
              <rect width="32" height="32" rx="6" fill="hsl(var(--primary))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <p className="text-lg font-bold text-primary tracking-tighter">ProductionFlow</p>
          </div>
          
          <div className="mt-4 sm:mt-0">
             <p className="text-sm text-muted-foreground">
                Um produto: <span className="font-semibold text-foreground">Candeeiro Filmes</span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center sm:flex-row sm:justify-between">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
                <Link href="/contact" className="hover:text-primary transition-colors">Contate-nos</Link>
                <Link href="/about" className="hover:text-primary transition-colors">Quem Somos</Link>
            </div>
            <p className="mt-4 sm:mt-0 text-sm text-muted-foreground">
                © {new Date().getFullYear()} ProductionFlow. Todos os direitos reservados.
            </p>
        </div>
      </div>
    </footer>
  );
}
