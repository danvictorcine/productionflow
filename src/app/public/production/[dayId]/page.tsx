
// @/src/app/public/production/[dayId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { AppFooter } from '@/components/app-footer';

type PublicShootingDayData = {
    day: ShootingDay;
    production: Production;
}

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

export default function PublicShootingDayPage() {
    const params = useParams();
    const dayId = params.dayId as string;
    
    const [data, setData] = useState<PublicShootingDayData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!dayId) {
            setError("ID da Ordem do Dia não encontrado.");
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const fetchedData = await firestoreApi.getPublicShootingDay(dayId);
                if (fetchedData) {
                    setData(fetchedData);
                } else {
                    setError("Esta Ordem do Dia não foi encontrada ou não é mais pública.");
                }
            } catch (err) {
                console.error(err);
                setError("Ocorreu um erro ao carregar os dados.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dayId]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-6">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-96 w-full" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg mt-6 bg-card">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h3 className="mt-4 text-xl font-semibold">{error}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Por favor, verifique o link ou contate o responsável pela produção.</p>
                </div>
            );
        }

        if (data) {
             const processedDay = {
                ...data.day,
                equipment: Array.isArray(data.day.equipment) ? data.day.equipment : [],
                costumes: Array.isArray(data.day.costumes) ? data.day.costumes : [],
                props: Array.isArray(data.day.props) ? data.day.props : [],
                generalNotes: Array.isArray(data.day.generalNotes) ? data.day.generalNotes : [],
            };
            
            return (
                <>
                    <ProductionInfoCard production={data.production} />
                    <Accordion type="single" collapsible defaultValue={data.day.id} className="w-full">
                         <ShootingDayCard
                            day={processedDay}
                            production={data.production}
                            isFetchingWeather={false}
                            isExporting={false}
                            isPublicView={true}
                        />
                    </Accordion>
                </>
            );
        }

        return null;
    }

    return (
        <div className="flex flex-col min-h-screen w-full bg-background">
             <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                 <div className="flex items-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))" />
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" />
                    </svg>
                    <h1 className="text-lg md:text-xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</h1>
                 </div>
                 <div className="ml-auto flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Visualização Pública</p>
                 </div>
             </header>
             <main className="flex-1 p-4 sm:p-6 md:p-8">
                {renderContent()}
             </main>
            <AppFooter />
        </div>
    );
}

