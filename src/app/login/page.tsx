
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Autoplay from "embla-carousel-autoplay"


import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';
import { useTheme } from "next-themes";
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Post, LoginPageContent } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Sun, Moon, ArrowRight } from 'lucide-react';
import { CopyableError } from '@/components/copyable-error';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { ProductionFlowIcon } from '@/components/production-flow-icon';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

const FeatureCardSkeleton = () => (
    <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="space-y-2 w-full">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    </div>
);

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.5 173.5 64.2L337.7 139.6C312.8 118.4 283.5 104 248 104c-80.3 0-145.3 65.8-145.3 146.9s65 146.9 145.3 146.9c95.2 0 130.6-76.3 134-114.3H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
    </svg>
  );


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const { setTheme } = useTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loginPageContent, setLoginPageContent] = useState<LoginPageContent | null>(null);

  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchContent = async () => {
        setIsContentLoading(true);
        try {
            const [latestPosts, content] = await Promise.all([
                firestoreApi.getPosts(2),
                firestoreApi.getLoginPageContent()
            ]);
            setPosts(latestPosts);
            setLoginPageContent(content);
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro em /login/page.tsx (fetchContent)',
                description: <CopyableError userMessage="Não foi possível carregar o conteúdo da página." errorCode={errorTyped.code || errorTyped.message} />
            });
        } finally {
            setIsContentLoading(false);
        }
    };
    fetchContent();
  }, [toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const getLoginErrorMessage = (errorCode: string) => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        return 'A configuração do Firebase está ausente. Por favor, verifique se o arquivo .env na raiz do seu projeto está preenchido com as chaves do seu projeto Firebase.'
    }
    
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos. Por favor, tente novamente.';
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/popup-closed-by-user':
        return 'O pop-up de login foi fechado antes da conclusão. Tente novamente.';
      case 'auth/too-many-requests':
        return 'Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.';
      default:
        return `Ocorreu um erro inesperado. Verifique a configuração do seu projeto Firebase.`;
    }
  }
  
  const stripHtml = (html: string) => {
    if (typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }
    return html.replace(/<[^>]+>/g, '');
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Login',
        description: <CopyableError userMessage={getLoginErrorMessage(error.code)} errorCode={error.code} />,
      });
    } finally {
        setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);

      if (additionalInfo?.isNewUser && user.email) {
        await firestoreApi.createUserProfile(
          user.uid,
          user.displayName || "Novo Usuário",
          user.email,
          user.photoURL
        );
      }
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Login com Google',
        description: <CopyableError userMessage={getLoginErrorMessage(error.code)} errorCode={error.code} />,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading || user) {
      return null;
  }
  
  const showBackground = loginPageContent?.isBackgroundEnabled && loginPageContent?.backgroundImageUrl;
  const hasCarouselImages = loginPageContent?.carouselImages && loginPageContent.carouselImages.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
        <div className="w-full lg:grid lg:grid-cols-2 flex-1">
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative bg-muted">
            {showBackground && (
                <>
                    <Image
                        src={loginPageContent.backgroundImageUrl!}
                        alt="Background"
                        layout="fill"
                        objectFit="cover"
                        className="z-0"
                    />
                    <div className="absolute inset-0 bg-black/50 z-10"></div>
                </>
            )}

            <div className="z-20 w-full h-full flex flex-col items-center justify-center overflow-y-auto">
                <div className="mx-auto w-full max-w-md space-y-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <ProductionFlowIcon className="h-10 w-10 flex-shrink-0" />
                        <h1 className={cn("text-4xl font-bold tracking-tighter", showBackground ? "text-white" : "text-foreground")} style={{color: showBackground ? 'white' : 'hsl(var(--brand-text))'}}>ProductionFlow</h1>
                        <Badge variant="outline" className={cn("px-2 py-0.5 text-[0.6rem] font-normal", showBackground && "bg-black/20 text-white border-white/50")}>BETA</Badge>
                    </div>
                    <p className={cn("text-lg", showBackground ? 'text-slate-200' : 'text-muted-foreground' )}>
                        Sua plataforma completa para a gestão de produções audiovisuais.
                    </p>
                </div>
                {hasCarouselImages ? (
                    <div className="mt-12 w-full max-w-lg">
                        <Carousel 
                             plugins={[plugin.current]}
                             className="w-full"
                             onMouseEnter={plugin.current.stop}
                             onMouseLeave={plugin.current.reset}
                        >
                            <CarouselContent>
                                {loginPageContent?.carouselImages?.map(image => (
                                    <CarouselItem key={image.id}>
                                        <Card className={cn("overflow-hidden", showBackground && "bg-white/10 text-white border-white/20")}>
                                            <CardContent className="p-2">
                                                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                                                     <Image src={image.url} alt="Imagem do Carrossel" layout="fill" objectFit="cover" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className={cn("left-2", showBackground && "bg-white/20 text-white border-white/30 hover:bg-white/30")} />
                            <CarouselNext className={cn("right-2", showBackground && "bg-white/20 text-white border-white/30 hover:bg-white/30")} />
                        </Carousel>
                    </div>
                ) : (
                    <div className="mt-12 w-full max-w-md">
                        {isContentLoading && <Skeleton className="h-64 w-full rounded-lg bg-white/10" />}
                    </div>
                )}
                 <div className="mt-8 w-full max-w-md">
                    {(isContentLoading || posts.length > 0) && (
                        <>
                            <h3 className={cn("mb-4 text-center text-lg font-semibold tracking-tight", showBackground ? "text-white" : "text-foreground")}>Últimas do Blog</h3>
                            {isContentLoading ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-36 w-full rounded-lg bg-white/10" />
                                    <Skeleton className="h-36 w-full rounded-lg bg-white/10" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {posts.map(post => {
                                        const plainTextContent = stripHtml(post.content);
                                        const snippet = plainTextContent.substring(0, 60) + (plainTextContent.length > 60 ? '...' : '');

                                        return (
                                        <Link key={post.id} href={`/blog#${post.id}`} className="block group">
                                            <Card className={cn("h-full hover:bg-background/50 transition-colors flex flex-col justify-between p-4", showBackground && "bg-white/5 hover:bg-white/10 text-slate-200 border-white/20")}>
                                                <div>
                                                    <CardTitle className={cn("text-base font-semibold leading-tight line-clamp-2", showBackground && "text-white")}>{post.title}</CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        {format(post.createdAt, "dd MMM, yyyy", { locale: ptBR })}
                                                    </CardDescription>
                                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                        {snippet}
                                                    </p>
                                                </div>
                                                <div className="text-xs font-semibold text-primary group-hover:underline flex items-center gap-1 mt-2">
                                                    Leia mais <ArrowRight className="h-3 w-3" />
                                                </div>
                                            </Card>
                                        </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
          </div>
          <div className="relative flex flex-col bg-card py-6 px-4">
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    Claro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    Escuro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    Sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex-1 flex items-center justify-center py-6">
                <div className="mx-auto grid w-full max-w-md gap-6">
                  <div className="grid gap-2 text-center">
                    <h1 className="text-3xl font-bold">Acesse sua Conta</h1>
                    <p className="text-balance text-muted-foreground">
                      Entre com seu email para continuar.
                    </p>
                  </div>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Entrar
                      </Button>
                    </form>
                  </Form>

                   <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                OU
                            </span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                        {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                        Continuar com o Google
                    </Button>

                  <div className="mt-4 text-center text-sm">
                    Não tem uma conta?{' '}
                    <Link href="/signup" className="underline">
                      Cadastre-se
                    </Link>
                  </div>
                </div>
            </div>
          </div>
        </div>
        <AppFooter />
    </div>
  );
}
