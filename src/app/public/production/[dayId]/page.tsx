

// @/src/app/public/production/[dayId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem } from '@/components/ui/accordion';

type PublicDayData = {
    production: Production,
    day: Omit<ShootingDay, 'equipment'|'costumes'|'props'|'generalNotes'> & { equipment: ChecklistItem[], costumes: ChecklistItem[], props: ChecklistItem[], generalNotes: ChecklistItem[]}
}

export default function PublicShootingDayPage() {
    const params = useParams();
    const dayId = params.dayId as string;
    
    const [data, setData] = useState<PublicDayData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!dayId) return;

        const fetchData = async () => {
            try {
                const fetchedData = await firestoreApi.getPublicShootingDay(dayId);

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

                const processedDay = {
                  ...fetchedData.day,
                  equipment: convertNotesToItems(fetchedData.day.equipment),
                  costumes: convertNotesToItems(fetchedData.day.costumes),
                  props: convertNotesToItems(fetchedData.day.props),
                  generalNotes: convertNotesToItems(fetchedData.day.generalNotes),
                };

                setData({ ...fetchedData, day: processedDay });
                
            } catch (error) {
                console.error("Failed to fetch public day data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dayId]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
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
                    <h1 className="text-2xl font-bold tracking-tight">{data.production.name}</h1>
                    <p className="text-muted-foreground">{data.production.type}</p>
                </div>

                <Accordion type="single" collapsible defaultValue={data.day.id} className="w-full">
                     <AccordionItem value={data.day.id} className="border-none">
                        <ShootingDayCard 
                            day={data.day}
                            production={data.production}
                            isFetchingWeather={false}
                            isExporting={false}
                            isPublicView={true}
                        />
                    </AccordionItem>
                </Accordion>
            </main>

            <AppFooter />
        </div>
    )
}
