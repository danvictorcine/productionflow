// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const ProductionInfoCard = ({ production }: { production: Production }) => (
    <div className="mb-6 p-4 border rounded-lg bg-card">
    <h2 className="text-2xl font-bold tracking-tight">{production.name}</h2>
    <p className="text-muted-foreground">{production.type}</p>
    <div className="text-base mt-2 space-y-1">
        <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>
        {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
        {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
        {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
    </div>
    </div>
);

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};


export default function PublicAllDaysPage() {
    const params = useParams();
    const { toast } = useToast();
    const productionId = params.id as string;

    const [production, setProduction] = useState<(Production & { days: ProcessedShootingDay[] }) | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!productionId) return;
        setIsLoading(true);
        firestoreApi.getPublicProduction(productionId)
            .then(data => {
                if (data) {
                    const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
                        if (Array.isArray(notes)) return notes.map(item => ({...item, id: item.id || crypto.randomUUID()}));
                        if (typeof notes === 'string' && notes.trim()) {
                            return notes.split('\n').filter(Boolean).map(line => ({
                                id: crypto.randomUUID(), text: line.trim(), checked: false
                            }));
                        }
                        return [];
                    };

                    const processedDays = data.days.map(day => ({
                      ...day,
                      equipment: convertNotesToItems(day.equipment),
                      costumes: convertNotesToItems(day.costumes),
                      props: convertNotesToItems(day.props),
                      generalNotes: convertNotesToItems(day.generalNotes),
                    }));

                    setProduction({ ...data, days: processedDays });
                } else {
                    toast({ variant: 'destructive', title: 'Não Encontrado', description: 'O link de compartilhamento pode ter expirado ou ser inválido.' });
                }
            })
            .catch((error) => {
                 const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar',
                    description: <CopyableError userMessage="Não foi possível carregar os dados compartilhados." errorCode={errorTyped.code || errorTyped.message} />,
                });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [productionId, toast]);

     if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!production) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p>Produção não encontrada.</p>
            </div>
        )
    }

    return (
         <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground hidden md:inline">Criado com:</span>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <Button asChild size="sm">
                      <Link href="/login">Acesse a Plataforma</Link>
                    </Button>
                    <p className="text-sm text-muted-foreground hidden sm:block">Visualização Pública</p>
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <ProductionInfoCard production={production} />
                  <Accordion type="multiple" className="w-full space-y-4">
                    {production.days.map(day => (
                        <ShootingDayCard
                            key={day.id}
                            day={day}
                            production={production}
                            isFetchingWeather={false}
                            isExporting={false}
                            isPublicView={true}
                        />
                    ))}
                  </Accordion>
            </main>
            <AppFooter />
        </div>
    );
}