
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';

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
    const params = useParams();
    const productionId = params.id as string;
    const { toast } = useToast();
    
    const [production, setProduction] = useState<Production | null>(null);
    const [shootingDays, setShootingDays] = useState<ProcessedShootingDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPublicProductionData = useCallback(async () => {
        if (!productionId) return;
        setIsLoading(true);
        try {
            const data = await firestoreApi.getPublicProduction(productionId);
            if (data) {
                const { days, ...prodData } = data;
                setProduction(prodData);
                
                const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
                    if (Array.isArray(notes)) return notes.map(item => ({ ...item, id: item.id || crypto.randomUUID() }));
                    if (typeof notes === 'string' && notes.trim()) {
                        return notes.split('\n').filter(Boolean).map(line => ({ id: crypto.randomUUID(), text: line.trim(), checked: false }));
                    }
                    return [];
                };

                const processedDays = (days || []).map(day => ({
                    ...day,
                    date: day.date,
                    equipment: convertNotesToItems(day.equipment),
                    costumes: convertNotesToItems(day.costumes),
                    props: convertNotesToItems(day.props),
                    generalNotes: convertNotesToItems(day.generalNotes),
                }));
                
                setShootingDays(processedDays);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Link inválido ou a produção não é mais pública.' });
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Carregar Produção',
                description: <CopyableError userMessage="Não foi possível carregar os dados desta produção." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [productionId, toast]);

    useEffect(() => {
        fetchPublicProductionData();
    }, [fetchPublicProductionData]);

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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Produção não encontrada.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen w-full bg-background">
             <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                <div className="flex items-center gap-2">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
                      <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                      <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                  </svg>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-2xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</h1>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                  </div>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <ProductionInfoCard production={production} />

                <div className="w-full space-y-4">
                    {shootingDays.length > 0 ? (
                        shootingDays.map(day => (
                            <ShootingDayCard 
                                key={day.id}
                                day={day}
                                production={production}
                                isFetchingWeather={false}
                                isPublicView={true}
                                isExporting={false}
                            />
                        ))
                    ) : (
                        <Card>
                            <CardContent className="p-12 text-center text-muted-foreground">
                                Nenhuma Ordem do Dia foi adicionada a esta produção ainda.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
            <AppFooter />
        </div>
    );
}
