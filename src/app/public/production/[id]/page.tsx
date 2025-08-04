// This file was renamed from [dayId] to [id] to fix a build error.
// The content is the same as the previous [dayId]/page.tsx.
'use client';

import { useState, useEffect } from "react";
import type { Production, ShootingDay } from "@/lib/types";
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { ProductionInfoCard } from '@/components/production-info-card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export default function PublicShootingDayPage({ params }: { params: { id: string }}) {
    const [data, setData] = useState<{ production: Production, day: ShootingDay } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (params.id) {
            firestoreApi.getPublicShootingDay(params.id)
                .then(fetchedData => {
                    if (fetchedData) {
                        setData(fetchedData);
                    } else {
                        setError("A Ordem do Dia solicitada não foi encontrada ou não está mais disponível publicamente.");
                    }
                })
                .catch(err => {
                    console.error("Error fetching public day:", err);
                    setError("Ocorreu um erro ao carregar os dados. Por favor, tente novamente mais tarde.");
                })
                .finally(() => setIsLoading(false));
        }
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen text-center p-4">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }
    
    if (!data) return null;

    return (
        <div className="flex flex-col min-h-screen w-full bg-muted/40">
            <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Criado com:</span>
                    <div className="flex items-center gap-1.5">
                        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                            <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                            <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                        </svg>
                        <span className="font-semibold text-sm" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</span>
                    </div>
                </div>
                
                <div className="ml-auto">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button asChild size="sm">
                                    <Link href="/login">
                                        <LogIn className="h-4 w-4 md:mr-2" />
                                        <span className="hidden md:inline">Acessar a Plataforma</span>
                                    </Link>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="md:hidden">
                                <p>Acessar a Plataforma</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </header>
             <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
                <ProductionInfoCard production={data.production} />
                <Accordion type="single" collapsible defaultValue={data.day.id} className="w-full">
                     <ShootingDayCard
                        key={data.day.id}
                        day={data.day as any}
                        production={data.production}
                        isFetchingWeather={false}
                        isPublicView={true}
                        isExporting={false}
                    />
                </Accordion>
            </main>
        </div>
    );
}
