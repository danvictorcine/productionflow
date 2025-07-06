// @/src/components/app-footer.tsx
"use client";

import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="w-full border-t border-border/40 mt-auto bg-background">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-2 sm:mb-0">
            <Link href="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contate-nos</Link>
            <Link href="/about" className="hover:text-primary transition-colors">Quem Somos</Link>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end items-center gap-x-3 gap-y-1 text-center sm:text-right mt-2 sm:mt-0">
              <p>
                  Um produto: <span className="font-semibold text-foreground">Candeeiro Filmes</span>
              </p>
              <span className="hidden sm:inline">|</span>
              <p>
                  © {new Date().getFullYear()} ProductionFlow. Todos os direitos reservados.
              </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
