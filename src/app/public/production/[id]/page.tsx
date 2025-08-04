// @/src/app/public/production/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { ProductionInfoCard } from '@/components/production-info-card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

export default function PublicShootingDayPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ production: Production; day: ProcessedShootingDay } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) {
        setError("ID da Ordem do Dia não fornecido.");
        setIsLoading(false);
        return;
    }

    const fetchData = async () => {
      try {
        const result = await firestoreApi.getPublicShootingDay(params.id);
        if (result) {
          const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
            if (Array.isArray(notes)) return notes.map(item => ({...item, id: item.id || crypto.randomUUID()}));
            if (typeof notes === 'string' && notes.trim()) {
              return notes.split('\n').filter(Boolean).map(line => ({ id: crypto.randomUUID(), text: line.trim(), checked: false }));
            }
            return [];
          };

          const processedDay: ProcessedShootingDay = {
            ...result.day,
            equipment: convertNotesToItems(result.day.equipment),
            costumes: convertNotesToItems(result.day.costumes),
            props: convertNotesToItems(result.day.props),
            generalNotes: convertNotesToItems(result.day.generalNotes),
          };
          
          setData({ production: result.production, day: processedDay });

        } else {
          setError("Ordem do Dia não encontrada ou não é pública.");
        }
      } catch (e) {
        console.error(e);
        setError("Ocorreu um erro ao carregar os dados.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="p-8 space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
    }
    if (error) {
      return <div className="text-center p-8 text-destructive">{error}</div>;
    }
    if (data) {
      return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
            <ProductionInfoCard production={data.production} />
            <Accordion type="single" collapsible defaultValue={data.day.id} className="w-full">
                <ShootingDayCard
                    day={data.day}
                    production={data.production}
                    isFetchingWeather={false}
                    isExporting={false}
                    isPublicView={true}
                />
            </Accordion>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
       <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
            <div className="flex items-center justify-center flex-1 gap-2">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                </svg>
                <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
            </div>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/login">
                                <LogIn className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Acessar a Plataforma</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Acessar a Plataforma</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </header>
        <main className="flex-1">
            {renderContent()}
        </main>
    </div>
  );
}
