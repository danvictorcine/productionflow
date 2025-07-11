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
import type { AboutPageContent, AboutPageTeamMember } from '@/lib/types';
import { CopyableError } from '@/components/copyable-error';
import { Card, CardContent } from '@/components/ui/card';

const TeamMemberCardSkeleton = () => (
    <Card className="text-center">
        <CardContent className="p-4">
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            <Skeleton className="h-5 w-3/4 mx-auto mt-4" />
            <Skeleton className="h-4 w-1/2 mx-auto mt-2" />
        </CardContent>
    </Card>
);

export default function AboutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pageContent, setPageContent] = useState<AboutPageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    firestoreApi.getPage('about')
      .then(content => {
        if (content) {
          setPageContent(content);
        } else {
          // Fallback content if nothing is in the database yet
          setPageContent({
            id: 'about',
            title: 'Quem Somos',
            content: `<h2>Nossa Missão</h2><p>Simplificar a gestão de produções audiovisuais, da ideia à finalização.</p><p>ProductionFlow é um produto da <span class="font-semibold">Candeeiro Filmes</span>.</p>`,
            updatedAt: new Date(),
            team: []
          });
        }
      })
      .catch(error => {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro ao carregar página',
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
        <h1 className="text-xl font-bold">Quem Somos</h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <rect width="32" height="32" rx="6" fill="hsl(var(--primary))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <p className="text-lg font-semibold text-primary tracking-tighter">ProductionFlow</p>
            <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                <TeamMemberCardSkeleton />
                <TeamMemberCardSkeleton />
                <TeamMemberCardSkeleton />
            </div>
          </div>
        ) : pageContent ? (
          <div className="space-y-12">
            <div 
              className="prose prose-lg dark:prose-invert max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: pageContent.content }}
            />
            {pageContent.team && pageContent.team.length > 0 && (
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-center mb-8">Nossa Equipe</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {pageContent.team.map((member) => (
                            <Card key={member.id} className="text-center border-0 shadow-none bg-transparent">
                                <CardContent className="p-4">
                                    <Image 
                                        src={member.photoUrl || 'https://placehold.co/200x200.png'} 
                                        alt={`Foto de ${member.name}`}
                                        width={128}
                                        height={128}
                                        className="h-32 w-32 rounded-full mx-auto object-cover"
                                        data-ai-hint="portrait professional"
                                    />
                                    <h3 className="text-xl font-semibold mt-4">{member.name}</h3>
                                    <p className="text-base text-primary">{member.role}</p>
                                    {member.bio && (
                                        <p className="text-sm text-muted-foreground mt-2">{member.bio}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
          </div>
        ) : (
          <p>Conteúdo não encontrado.</p>
        )}
      </main>
      <AppFooter />
    </>
  );
}
