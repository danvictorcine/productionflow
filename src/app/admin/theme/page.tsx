

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RotateCcw, Save } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { ThemeSettings } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminGuard from '@/components/admin-guard';
import { ProductionFlowIcon } from '@/components/production-flow-icon';

const defaultColors: Omit<ThemeSettings, 'brandLogin'> = {
    primary: '231 48% 48%',
    secondary: '240 4.8% 95.9%',
    accent: '174 100% 29.4%',
    background: '0 0% 93.3%',
    foreground: '240 10% 3.9%',
    card: '0 0% 100%',
    destructive: '0 84.2% 60.2%',
    border: '0 0% 89.8%',
    chart1: '231 48% 48%',
    chart2: '174 100% 29.4%',
    chart3: '231 48% 68%',
    chart4: '174 100% 49.4%',
    chart5: '231 48% 88%',
    brandIcon: '231 48% 48%',
    brandText: '240 10% 3.9%',
};

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}$f(8)}$f(4)}`;
}

function hslStringToHex(hslString: string): string {
    if (!hslString) return '#000000';
    const [h, s, l] = hslString.replace(/%/g, '').split(' ').map(Number);
    if (!isNaN(h) && !isNaN(s) && !isNaN(l)) {
        return hslToHex(h, s, l);
    }
    return '#000000'; // Fallback
}

const ColorPicker = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => {
    const hexValue = hslStringToHex(value);
    
    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            let r = parseInt(result[1], 16) / 255;
            let g = parseInt(result[2], 16) / 255;
            let b = parseInt(result[3], 16) / 255;
            
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            
            onChange(`${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`);
        }
    };

    return (
        <div className="relative w-16 h-10 rounded-md border" style={{ backgroundColor: `hsl(${value})` }}>
            <input
                type="color"
                value={hexValue}
                onChange={handleHexChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>
    );
};


function ManageThemePageDetail() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    
    const { control, handleSubmit, watch, reset } = useForm<ThemeSettings>({
        defaultValues: defaultColors
    });
    
    const watchedColors = watch();

    const fetchTheme = useCallback(async () => {
        setIsLoading(true);
        try {
            const savedTheme = await firestoreApi.getThemeSettings();
            const currentTheme = { ...defaultColors, ...(savedTheme || {}) };
            reset(currentTheme);
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Carregar Tema',
                description: <CopyableError userMessage="Não foi possível carregar o tema salvo." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast, reset]);

    useEffect(() => {
        fetchTheme();
    }, [fetchTheme]);

    const onSubmit = async (data: ThemeSettings) => {
        setIsSaving(true);
        try {
            await firestoreApi.saveThemeSettings(data);
            toast({ title: 'Tema salvo com sucesso!', description: 'As alterações podem levar alguns segundos para serem aplicadas em todo o site.' });
            window.location.reload();
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar o tema." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRestoreDefault = async () => {
        setIsRestoring(true);
        try {
            await firestoreApi.deleteThemeSettings();
            toast({ title: 'Tema Padrão Restaurado!', description: 'O aplicativo voltará a usar as cores originais.' });
            window.location.reload();
        } catch (error) {
             const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Restaurar',
                description: <CopyableError userMessage="Não foi possível restaurar o tema padrão." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsRestoring(false);
        }
    }

    if (isLoading) {
        return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
    }

    const coreColors = ['background', 'foreground', 'card', 'border', 'primary', 'secondary', 'accent', 'destructive'] as const;
    const chartColors = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5'] as const;
    const brandColors = ['brandIcon', 'brandText'] as const;

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/admin" className="flex items-center gap-2" aria-label="Voltar para o Painel">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Gerenciar Tema do Aplicativo</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>

            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Color Pickers */}
                        <div className="space-y-6">
                           <Card>
                                <CardHeader>
                                    <CardTitle>Cores Principais</CardTitle>
                                    <CardDescription>Clique nas cores para alterá-las. Os valores HSL são atualizados automaticamente.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {coreColors.map((key) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <label htmlFor={key} className="capitalize font-medium">{key}</label>
                                            <div className="flex items-center gap-2">
                                                <Controller
                                                    name={key}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <ColorPicker value={field.value} onChange={field.onChange} />
                                                    )}
                                                />
                                                <Controller
                                                    name={key}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <input
                                                            {...field}
                                                            className="w-40 p-2 border rounded-md font-mono text-sm bg-muted"
                                                            readOnly
                                                        />
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cores da Marca</CardTitle>
                                    <CardDescription>Personalize a cor da logo "ProductionFlow".</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                     <div className="space-y-3">
                                        <h4 className="text-sm font-medium">App e Página de Login</h4>
                                         <div className="flex items-center justify-center p-4 rounded-lg bg-muted">
                                            <ProductionFlowIcon className="h-7 w-7" style={{ color: `hsl(${watchedColors.brandIcon})` }} />
                                            <p className="text-lg font-semibold tracking-tighter ml-2" style={{color: `hsl(${watchedColors.brandText})`}}>ProductionFlow</p>
                                        </div>
                                        <div key="brandIcon" className="flex items-center justify-between">
                                            <label htmlFor="brandIcon" className="capitalize font-medium">Cor do Ícone</label>
                                            <div className="flex items-center gap-2">
                                                <Controller name="brandIcon" control={control} render={({ field }) => (<ColorPicker value={field.value} onChange={field.onChange} />)}/>
                                                <Controller name="brandIcon" control={control} render={({ field }) => (<input {...field} className="w-40 p-2 border rounded-md font-mono text-sm bg-muted" readOnly />)} />
                                            </div>
                                        </div>
                                        <div key="brandText" className="flex items-center justify-between">
                                            <label htmlFor="brandText" className="capitalize font-medium">Cor do Texto</label>
                                            <div className="flex items-center gap-2">
                                                <Controller name="brandText" control={control} render={({ field }) => (<ColorPicker value={field.value} onChange={field.onChange} />)}/>
                                                <Controller name="brandText" control={control} render={({ field }) => (<input {...field} className="w-40 p-2 border rounded-md font-mono text-sm bg-muted" readOnly />)} />
                                            </div>
                                        </div>
                                     </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cores dos Gráficos</CardTitle>
                                    <CardDescription>Defina as cores para as barras e seções dos gráficos.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {chartColors.map((key) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <label htmlFor={key} className="capitalize font-medium">{key.replace('chart', 'Chart ')}</label>
                                            <div className="flex items-center gap-2">
                                                <Controller name={key} control={control} render={({ field }) => (<ColorPicker value={field.value} onChange={field.onChange} />)}/>
                                                <Controller name={key} control={control} render={({ field }) => (<input {...field} className="w-40 p-2 border rounded-md font-mono text-sm bg-muted" readOnly />)} />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Preview */}
                        <div className="space-y-6">
                            <CardHeader className="px-1">
                                <CardTitle>Pré-visualização em Tempo Real</CardTitle>
                                <CardDescription>Veja como os componentes do aplicativo se parecerão com as cores selecionadas.</CardDescription>
                            </CardHeader>
                            <div
                                className="p-8 rounded-lg border"
                                style={{
                                    '--background-preview': `hsl(${watchedColors.background})`,
                                    '--foreground-preview': `hsl(${watchedColors.foreground})`,
                                    '--card-preview': `hsl(${watchedColors.card})`,
                                    '--primary-preview': `hsl(${watchedColors.primary})`,
                                    '--secondary-preview': `hsl(${watchedColors.secondary})`,
                                    '--accent-preview': `hsl(${watchedColors.accent})`,
                                    '--destructive-preview': `hsl(${watchedColors.destructive})`,
                                    '--border-preview': `hsl(${watchedColors.border})`,
                                    backgroundColor: 'var(--background-preview)',
                                    color: 'var(--foreground-preview)',
                                    borderColor: 'var(--border-preview)',
                                } as React.CSSProperties}
                            >
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold" style={{ color: `var(--foreground-preview)`}}>Título de Exemplo</h3>
                                    <p style={{ color: `var(--foreground-preview)`}}>
                                        Este é um parágrafo de exemplo para mostrar a cor do texto. <a href="#" style={{color: `var(--primary-preview)`}}>Este é um link.</a>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Button style={{ backgroundColor: `var(--primary-preview)`, color: 'hsl(var(--primary-foreground))'}}>Botão Primário</Button>
                                        <Button variant="secondary" style={{ backgroundColor: `var(--secondary-preview)`, color: 'hsl(var(--secondary-foreground))'}}>Secundário</Button>
                                        <Button variant="destructive" style={{ backgroundColor: `var(--destructive-preview)`, color: 'hsl(var(--destructive-foreground))'}}>Destrutivo</Button>
                                    </div>
                                    <Card style={{ backgroundColor: `var(--card-preview)`, borderColor: 'var(--border-preview)'}}>
                                        <CardContent className="p-4">
                                            <p style={{ color: `var(--foreground-preview)`}}>Isto é um card de exemplo.</p>
                                        </CardContent>
                                    </Card>
                                    <div className="p-4 rounded-md" style={{ backgroundColor: `var(--accent-preview)`}}>
                                        <p style={{ color: 'hsl(var(--accent-foreground))'}}>Esta área usa a cor de destaque (accent).</p>
                                    </div>
                                    {/* Mini Chart Preview */}
                                    <div className="flex pt-4 h-24 gap-1 items-end">
                                        <div className="w-1/5 h-[50%] rounded-t-sm" style={{backgroundColor: `hsl(${watchedColors.chart1})`}}></div>
                                        <div className="w-1/5 h-[80%] rounded-t-sm" style={{backgroundColor: `hsl(${watchedColors.chart2})`}}></div>
                                        <div className="w-1/5 h-[60%] rounded-t-sm" style={{backgroundColor: `hsl(${watchedColors.chart3})`}}></div>
                                        <div className="w-1/5 h-[90%] rounded-t-sm" style={{backgroundColor: `hsl(${watchedColors.chart4})`}}></div>
                                        <div className="w-1/5 h-[70%] rounded-t-sm" style={{backgroundColor: `hsl(${watchedColors.chart5})`}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex items-center gap-4">
                        <Button type="submit" size="lg" disabled={isSaving || isRestoring}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Salvar Tema
                        </Button>
                        
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button type="button" variant="outline" size="lg" disabled={isSaving || isRestoring}>
                                    {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                                    Restaurar Padrão
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Restaurar Tema Padrão?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza de que deseja restaurar as cores originais? Todas as suas personalizações atuais serão perdidas.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRestoreDefault}>Sim, Restaurar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </form>
            </main>
            <AppFooter />
        </div>
    );
}

export default function ManageThemePage() {
    return (
        <AdminGuard>
            <ManageThemePageDetail />
        </AdminGuard>
    );
}
