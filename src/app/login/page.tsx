'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/context/auth-context';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Users, FileSpreadsheet, Clapperboard } from 'lucide-react';
import { CopyableError } from '@/components/copyable-error';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const getLoginErrorMessage = (errorCode: string) => {
    // This provides a specific, helpful message if the environment variables are missing.
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
      case 'auth/too-many-requests':
        return 'Acesso bloqueado temporariamente devido a muitas tentativas. Tente novamente mais tarde.';
      default:
        return `Ocorreu um erro inesperado. Verifique a configuração do seu projeto Firebase.`;
    }
  }

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

  if (loading || user) {
      return null;
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-8 relative">
        <div className="mx-auto w-full max-w-md space-y-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
                  <rect width="32" height="32" rx="6" fill="hsl(var(--primary))"/>
                  <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
              </svg>
              <h1 className="text-4xl font-bold text-foreground tracking-tighter">ProductionFlow</h1>
            </div>
            <p className="text-lg text-muted-foreground">
                Sua plataforma completa para a gestão financeira de produções audiovisuais.
            </p>
        </div>
        <div className="mt-12 grid gap-8 w-full max-w-md">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <DollarSign className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Orçamento Inteligente</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Controle seu orçamento, despesas e saldo em tempo real, com gráficos claros e detalhados.
                    </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <Users className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Gestão de Equipe Completa</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Cadastre sua equipe, gerencie informações de contato e controle pagamentos de cachês e diárias.
                    </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <Clapperboard className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Ordem do Dia Detalhada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Crie e gerencie Ordens do Dia (Call Sheets) com horários, cenas, clima e checklists interativos.
                    </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Relatórios Simplificados</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Exporte relatórios financeiros e de produção para Excel e PDF com um clique.
                    </p>
                </div>
            </div>
        </div>
        <div className="absolute bottom-8">
            <p className="text-sm text-muted-foreground">
                Um produto: <span className="font-semibold text-foreground">Candeeiro Filmes</span>
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-6">
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
              <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{' '}
            <Link href="/signup" className="underline">
              Cadastre-se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
