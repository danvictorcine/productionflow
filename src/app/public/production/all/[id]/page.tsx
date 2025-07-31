

// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Accordion, AccordionTrigger, AccordionContent, AccordionItem } from '@/components/ui/accordion';


type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

type PublicProductionData = Production & { days: ProcessedShootingDay[] };

export default function PublicProductionPage() {
    const params = useParams();
    const productionId = params.id as string;
    
    const [data, setData] = useState<PublicProductionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!productionId) return;

        const fetchData = async () => {
            try {
                const fetchedData = await firestoreApi.getPublicProduction(productionId);

                if (!fetchedData) {
                    return notFound();
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

                const processedDays = fetchedData.days.map(day => ({
                  ...day,
                  equipment: convertNotesToItems(day.equipment),
                  costumes: convertNotesToItems(day.costumes),
                  props: convertNotesToItems(day.props),
                  generalNotes: convertNotesToItems(day.generalNotes),
                }));

                setData({ ...fetchedData, days: processedDays });
                
            } catch (error) {
                console.error("Failed to fetch public production data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productionId]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        );
    }
    
    if (!data) {
        return notFound();
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Criado com:</span>
                     <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
                 <div className="ml-auto flex items-center gap-4">
                    <h1 className="text-lg font-semibold text-muted-foreground">Visualização Pública</h1>
                     <Button asChild>
                      <Link href="/login">Acesse a Plataforma</Link>
                    </Button>
                </div>
            </header>

             <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-6 p-4 border rounded-lg bg-card">
                    <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
                    <p className="text-muted-foreground">{data.type}</p>
                    <div className="text-base mt-2 space-y-1">
                        <p><span className="font-semibold">Diretor(a):</span> {data.director}</p>
                        {data.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {data.responsibleProducer}</p>}
                        {data.producer && <p><span className="font-semibold">Produtora:</span> {data.producer}</p>}
                        {data.client && <p><span className="font-semibold">Cliente:</span> {data.client}</p>}
                    </div>
                </div>

                <h2 className="text-2xl font-bold tracking-tight mb-4">Ordens do Dia</h2>

                <Accordion 
                    type="multiple" 
                    className="w-full space-y-4"
                >
                     {data.days.map(day => (
                        <AccordionItem key={day.id} value={day.id} className="border-none">
                            <ShootingDayCard 
                                day={day}
                                production={data}
                                isFetchingWeather={false}
                                isExporting={false}
                                isPublicView={true}
                            />
                        </AccordionItem>
                    ))}
                </Accordion>
            </main>

            <AppFooter />
        </div>
    )
}
