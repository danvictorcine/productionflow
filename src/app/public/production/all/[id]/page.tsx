
// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { CopyableError } from '@/components/copyable-error';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AppFooter } from '@/components/app-footer';
import { Accordion } from '@/components/ui/accordion';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

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


export default function PublicProductionPage() {
    const router = useRouter();
    const params = useParams();
    const productionId = params.id as string;
    const { toast } = useToast();

    const [production, setProduction] = useState<Production | null>(null);
    const [shootingDays, setShootingDays] = useState<ProcessedShootingDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
        if (!productionId) return;

        const fetchProductionData = async () => {
            setIsLoading(true);
            try {
                const data = await firestoreApi.getPublicProduction(productionId);

                if (data) {
                    const { days, ...prodData } = data;
                    setProduction(prodData);
                    
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

                    const processedDays = (days || []).map(day => ({
                      ...day,
                      equipment: convertNotesToItems(day.equipment),
                      costumes: convertNotesToItems(day.costumes),
                      props: convertNotesToItems(day.props),
                      generalNotes: convertNotesToItems(day.generalNotes),
                    }));

                    setShootingDays(processedDays);
                } else {
                    toast({ variant: 'destructive', title: 'Erro', description: 'Página de produção não encontrada ou não compartilhada.' });
                }
            } catch (error) {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Carregar Dados',
                    description: <CopyableError userMessage="Não foi possível carregar os dados da produção." errorCode={errorTyped.code || errorTyped.message} />,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProductionData();
    }, [productionId, toast]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <div className="space-y-6">
                    <Skeleton className="h-[300px] w-full" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
            </div>
        );
    }
    
    if (!production) {
        return <div className="flex items-center justify-center h-screen">Produção não encontrada.</div>;
    }

    return (
        <div className="flex flex-col min-h-screen w-full bg-background">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                <h1 className="text-lg md:text-xl font-bold text-primary truncate">{production.name}</h1>
                <p className="text-lg text-muted-foreground hidden md:inline-block">- Ordem do Dia (Pública)</p>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <ProductionInfoCard production={production} />

                {shootingDays.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Nenhuma Ordem do Dia foi adicionada a esta produção ainda.</p>
                    </div>
                ) : (
                    <Accordion type="multiple" className="w-full space-y-4">
                        {shootingDays.map(day => (
                            <ShootingDayCard 
                                key={day.id} 
                                day={day} 
                                production={production}
                                isFetchingWeather={false}
                                isPublicView={true}
                                isExporting={false}
                            />
                        ))}
                    </Accordion>
                )}
            </main>
            <AppFooter />
        </div>
    );
}
