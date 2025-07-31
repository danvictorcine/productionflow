
// @/src/app/public/production/[dayId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};


export default function PublicShootingDayPage() {
    const params = useParams();
    const dayId = params.dayId as string;
    const { toast } = useToast();

    const [data, setData] = useState<{ production: Production; day: ProcessedShootingDay } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!dayId) return;

        const fetchData = async () => {
            try {
                const fetchedData = await firestoreApi.getPublicShootingDay(dayId);
                if (!fetchedData) {
                    notFound();
                    return;
                }

                 const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
                    if (Array.isArray(notes)) {
                        return notes.map(item => ({...item, id: item.id || crypto.randomUUID()}));
                    }
                    if (typeof notes === 'string' && notes.trim()) {
                        return notes.split('\n').filter(Boolean).map(line => ({
                            id: crypto.randomUUID(),
                            text: line.trim(),
                            checked: false
                        }));
                    }
                    return [];
                };

                const processedDay = {
                    ...fetchedData.day,
                    equipment: convertNotesToItems(fetchedData.day.equipment),
                    costumes: convertNotesToItems(fetchedData.day.costumes),
                    props: convertNotesToItems(fetchedData.day.props),
                    generalNotes: convertNotesToItems(fetchedData.day.generalNotes),
                };
                
                setData({ ...fetchedData, day: processedDay });

            } catch (error) {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Carregar',
                    description: <CopyableError userMessage="Não foi possível carregar os dados da Ordem do Dia." errorCode={errorTyped.code || 'UNKNOWN_FETCH_ERROR'} />,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dayId, toast]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
    }

    if (!data) {
        return notFound();
    }

    const { production, day } = data;

    return (
        <div className="flex flex-col min-h-screen w-full bg-background">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-x-3 text-muted-foreground">
                    <span className="text-sm">Criado com:</span>
                    <div className="flex items-center gap-1.5">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                            <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                            <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                        </svg>
                        <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    </div>
                </div>
                 <div className="ml-auto flex items-center gap-4">
                    <h1 className="text-lg font-bold text-muted-foreground">Visualização Pública</h1>
                     <Button asChild>
                        <Link href="/login">Acesse a Plataforma</Link>
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8">
                 <Accordion type="single" collapsible defaultValue={day.id} className="w-full">
                    <ShootingDayCard 
                        day={day}
                        production={production}
                        isFetchingWeather={false}
                        isExporting={false}
                        isPublicView={true}
                    />
                </Accordion>
            </main>
            <AppFooter />
        </div>
    );
}
