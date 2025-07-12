'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { PageContent } from '@/lib/types';
import { CopyableError } from '@/components/copyable-error';

export default function ContactPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    firestoreApi.getPage('contact')
      .then(content => {
        if (content) {
          setPageContent(content);
        } else {
          // Fallback content if nothing is in the database yet
          setPageContent({
            id: 'contact',
            title: 'Contato',
            content: `<h2>Entre em Contato</h2><p>Estamos aqui para ajudar. Envie um e-mail para <a href="mailto:contato@productionflow.com" class="text-primary hover:underline">contato@productionflow.com</a>.</p>`,
            updatedAt: new Date(),
          });
        }
      })
      .catch(error => {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro em /contact/page.tsx',
            description: <CopyableError userMessage="Não foi possível carregar o conteúdo da página." errorCode={errorTyped.code || errorTyped.message} />,
        });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Contato</h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <rect width="32" height="32" rx="6" fill="hsl(var(--primary))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <p className="text-lg font-semibold text-foreground tracking-tighter">ProductionFlow</p>
            <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
          </div>
          {user && <UserNav />}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          ) : pageContent ? (
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: pageContent.content }}
            />
          ) : (
            <p>Conteúdo não encontrado.</p>
          )}
      </main>
      <AppFooter />
    </>
  );
}
