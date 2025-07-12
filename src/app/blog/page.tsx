'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Post } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserNav } from '@/components/user-nav';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { getInitials } from '@/lib/utils';

export default function BlogPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const fetchedPosts = await firestoreApi.getPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
          variant: 'destructive',
          title: 'Erro em /blog/page.tsx (fetchPosts)',
          description: <CopyableError userMessage="Não foi possível carregar as publicações do blog." errorCode={errorTyped.code || errorTyped.message} />,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [toast]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
              <CardFooter>
                 <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-24">
          <h2 className="text-2xl font-semibold">Nenhuma publicação ainda.</h2>
          <p className="text-muted-foreground mt-2">Volte em breve para novidades e atualizações!</p>
        </div>
      );
    }

    return (
      <div className="space-y-12">
        {posts.map(post => (
          <article key={post.id} id={post.id} className="scroll-mt-20">
            <Card className="w-full overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold tracking-tight">{post.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={post.authorPhotoURL} />
                                <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                            </Avatar>
                            <span>{post.authorName}</span>
                        </div>
                        <time dateTime={post.createdAt.toISOString()}>
                            {format(post.createdAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </time>
                    </div>
                </CardHeader>
                <CardContent className="prose prose-lg dark:prose-invert max-w-none text-foreground text-base"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </Card>
          </article>
        ))}
      </div>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Blog & Atualizações</h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
            <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
          </div>
          {user && <UserNav />}
        </div>
      </header>
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderContent()}
      </main>
      <AppFooter />
    </>
  );
}
