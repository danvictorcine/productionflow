'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import AuthGuard from '@/components/auth-guard';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email(),
});

function SettingsPageDetail() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, form]);

  const handleUpdateName = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await firestoreApi.updateUserProfile(user.uid, { name: values.name });
      await refreshUser();
      toast({ title: 'Sucesso!', description: 'Seu nome foi atualizado.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsSendingEmail(true);
    try {
      await firestoreApi.sendPasswordReset(user.email);
      toast({ title: 'E-mail Enviado', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
       <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Projetos</span>
            </Button>
        </Link>
        <h1 className="text-xl font-bold">Configurações da Conta</h1>
      </header>
       <main className="flex-1 p-4 sm:p-6 md:p-8 flex justify-center items-start">
        <Card className="w-full max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateName)}>
              <CardHeader>
                <CardTitle>Perfil e Segurança</CardTitle>
                <CardDescription>Gerencie as informações da sua conta e senha.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input readOnly disabled {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                 <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações no Perfil
                 </Button>
                 
                 <Separator />

                 <div className="space-y-4">
                    <FormLabel>Senha</FormLabel>
                     <p className="text-sm text-muted-foreground">
                        Para alterar sua senha, enviaremos um link de redefinição para seu e-mail.
                    </p>
                    <Button type="button" variant="outline" onClick={handlePasswordReset} disabled={isSendingEmail}>
                        {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar e-mail para alterar senha
                    </Button>
                 </div>
              </CardContent>
            </form>
          </Form>
        </Card>
       </main>
    </div>
  );
}

export default function SettingsPage() {
    return (
        <AuthGuard>
            <SettingsPageDetail />
        </AuthGuard>
    )
}
