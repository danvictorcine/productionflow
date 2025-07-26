
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { BetaLimits } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DEFAULT_BETA_LIMITS } from '@/lib/app-config';

const limitsSchema = z.object({
  MAX_PROJECTS_PER_USER: z.coerce.number().min(0, "O valor deve ser 0 ou maior."),
  MAX_ITEMS_PER_MOODBOARD: z.coerce.number().min(0, "O valor deve ser 0 ou maior."),
  MAX_PANELS_PER_STORYBOARD_SCENE: z.coerce.number().min(0, "O valor deve ser 0 ou maior."),
});

type FormValues = z.infer<typeof limitsSchema>;

export default function ManageLimitsPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(limitsSchema),
        defaultValues: DEFAULT_BETA_LIMITS,
    });

    const fetchLimits = useCallback(async () => {
        setIsLoading(true);
        try {
            const savedLimits = await firestoreApi.getBetaLimits();
            form.reset(savedLimits);
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Carregar Limites',
                description: <CopyableError userMessage="Não foi possível carregar os limites salvos." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, form]);

    useEffect(() => {
        fetchLimits();
    }, [fetchLimits]);

    const onSubmit = async (data: FormValues) => {
        setIsSaving(true);
        try {
            await firestoreApi.saveBetaLimits(data);
            toast({ title: 'Limites salvos com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar os limites." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-10 w-24" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/admin" className="flex items-center gap-2" aria-label="Voltar para o Painel">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Gerenciar Limites (Beta)</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Card>
                    <CardHeader>
                        <CardTitle>Controle de Limites para Usuários</CardTitle>
                        <CardDescription>
                            Defina os limites de recursos para usuários não-administradores durante a fase Beta.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Alert className="mb-6">
                            <Settings className="h-4 w-4" />
                            <AlertTitle>Como funciona?</AlertTitle>
                            <AlertDescription>
                                Os valores definidos aqui são aplicados em tempo real para todos os usuários que não são administradores. Administradores têm acesso ilimitado.
                            </AlertDescription>
                        </Alert>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="MAX_PROJECTS_PER_USER"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Máximo de Projetos por Usuário</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Ex: 5" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="MAX_ITEMS_PER_MOODBOARD"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Máximo de Itens por Moodboard</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Ex: 25" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="MAX_PANELS_PER_STORYBOARD_SCENE"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Máximo de Quadros por Cena de Storyboard</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Ex: 20" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar Limites
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </main>
            <AppFooter />
        </div>
    );
}
