
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { PageContent, TeamMemberAbout } from '@/lib/types';
import { CopyableError } from '@/components/copyable-error';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { ProductionFlowIcon } from '@/components/production-flow-icon';


export default function AboutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberAbout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackContent: PageContent = {
    id: 'about',
    title: 'Quem Somos',
    content: `<h2>Nossa Missão</h2><p>Simplificar a gestão de produções audiovisuais, da ideia à finalização.</p><p>ProductionFlow é um produto da <span class="font-semibold">Candeeiro Filmes</span>.</p>`,
    updatedAt: new Date(),
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [content, members] = await Promise.all([
          firestoreApi.getPage('about'),
          firestoreApi.getTeamMembers()
        ]);
        
        setPageContent(content || fallbackContent);
        setTeamMembers(members);

      } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro em /about/page.tsx',
            description: <CopyableError userMessage="Não foi possível carregar o conteúdo da página." errorCode={errorTyped.code || errorTyped.message} />,
        });
        setPageContent(fallbackContent);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Quem Somos</h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ProductionFlowIcon className="h-7 w-7" />
            <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
            <Badge variant="outline" className="px-2 py-0.5 text-[0.6rem] font-normal">BETA</Badge>
          </div>
          {user && <UserNav />}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
          <div className="space-y-12">
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
                </div>
            </div>
          </div>
        ) : (
          <>
            {pageContent && (
              <div
                className="prose prose-lg dark:prose-invert max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: pageContent.content }}
              />
            )}

            {teamMembers.length > 0 && (
              <section className="mt-16">
                <h2 className="text-3xl font-bold tracking-tight text-center mb-10">Nossa Equipe</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                  {teamMembers.map(member => (
                    <div key={member.id} className="text-center">
                        <Avatar className="h-32 w-32 mx-auto mb-4">
                            <AvatarImage src={member.photoURL} alt={member.name} className="object-cover" />
                            <AvatarFallback className="text-4xl">{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-semibold">{member.name}</h3>
                        <p className="text-primary font-medium">{member.role}</p>
                        <p className="mt-2 text-muted-foreground text-sm">{member.bio}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <AppFooter />
    </>
  );
}
