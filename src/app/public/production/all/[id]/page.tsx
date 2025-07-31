

// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

type PublicProductionAll = Omit<Production, 'days'> & {
    days: ProcessedShootingDay[];
}

const ProductionInfoCard = ({ production }: { production: Production }) => (
    <Card>
        <CardHeader>
            <CardTitle>{production.name}</CardTitle>
            <CardDescription>{production.type}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
             {production.director && <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>}
             {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
             {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
             {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
        </CardContent>
    </Card>
);

export default function PublicProductionAllPage() {
    const params = useParams();
    const router = useRouter();
    const productionId = params.id as string;
    const { toast } = useToast();

    const [publicProduction, setPublicProduction] = useState<PublicProductionAll | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!productionId) {
            notFound();
            return;
        }

        const fetchData = async () => {
            try {
                const data = await firestoreApi.getPublicProduction(productionId);
                if (data) {
                    const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
                        if (Array.isArray(notes)) { return notes.map(item => ({...item, id: item.id || crypto.randomUUID()})); }
                        if (typeof notes === 'string' && notes.trim()) { return notes.split('\n').filter(Boolean).map(line => ({ id: crypto.randomUUID(), text: line.trim(), checked: false })); }
                        return [];
                    };
                    
                    const processedDays = data.days.map(day => ({
                      ...day,
                      equipment: convertNotesToItems(day.equipment),
                      costumes: convertNotesToItems(day.costumes),
                      props: convertNotesToItems(day.props),
                      generalNotes: convertNotesToItems(day.generalNotes),
                    }));

                    setPublicProduction({ ...data, days: processedDays });

                } else {
                    notFound();
                }
            } catch (error) {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar dados',
                    description: <CopyableError userMessage="Não foi possível carregar os dados públicos." errorCode={errorTyped.code || errorTyped.message} />,
                });
                notFound();
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productionId, toast]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[150px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }
    
    if (!publicProduction) {
        return null; // or a more specific not found component, as notFound() will handle redirection.
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Criado com:</span>
                     <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-base font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
                <div className="ml-auto flex items-center gap-4">
                   <h2 className="text-lg font-semibold hidden md:block">Visualização Pública</h2>
                    <Button asChild>
                        <Link href="/login">Acesse a Plataforma</Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <ProductionInfoCard production={publicProduction} />
                
                <div className="mt-6 space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">Ordens do Dia</h2>
                    {publicProduction.days.length > 0 ? (
                        publicProduction.days.map((day) => (
                           <ShootingDayCard
                                key={day.id}
                                day={day}
                                production={publicProduction}
                                isFetchingWeather={false}
                                isExporting={false}
                                isPublicView={true}
                            />
                        ))
                    ) : (
                        <p className="text-muted-foreground">Nenhuma ordem do dia encontrada para esta produção.</p>
                    )}
                </div>
            </main>
            <AppFooter />
        </div>
    );
}
