

// @/src/app/public/day/[publicId]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import { format, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { AppFooter } from '@/components/app-footer';
import { CopyableError } from '@/components/copyable-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

export default function PublicShootingDayPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const { toast } = useToast();

  const [day, setDay] = useState<ProcessedShootingDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);

  const fetchPublicDay = useCallback(async () => {
    if (!publicId) return;
    setIsLoading(true);
    try {
      const dayData = await firestoreApi.getPublicShootingDay(publicId);

      if (dayData) {
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
          ...dayData,
          equipment: convertNotesToItems(dayData.equipment),
          costumes: convertNotesToItems(dayData.costumes),
          props: convertNotesToItems(dayData.props),
          generalNotes: convertNotesToItems(dayData.generalNotes),
        };
        setDay(processedDay);
      } else {
        notFound();
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: <CopyableError userMessage="Não foi possível carregar a Ordem do Dia." errorCode={errorTyped.code || errorTyped.message} />,
      });
      // Optionally render an error state instead of a 404
      setDay(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicId, toast]);

  useEffect(() => {
    fetchPublicDay();
  }, [fetchPublicDay]);

  useEffect(() => {
    if (!day || !day.startTime || !day.endTime || !isToday(day.date)) {
        setRemainingTime(null);
        return;
    }
    
    const calculateTimes = () => {
        const [startH, startM] = day.startTime!.split(':').map(Number);
        const [endH, endM] = day.endTime!.split(':').map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
            setRemainingTime(null);
            return;
        }

        const startDate = new Date(0, 0, 0, startH, startM);
        const endDate = new Date(0, 0, 0, endH, endM);
        let diff = endDate.getTime() - startDate.getTime();
        if (diff < 0) diff += 24 * 60 * 60 * 1000;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        setRemainingTime(`${hours}h ${minutes}m`);
    };

    calculateTimes();
    const intervalId = setInterval(calculateTimes, 60000);
    return () => clearInterval(intervalId);
  }, [day]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!day) {
    // This state can be reached if fetchPublicDay catches an error
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <div>
          <h1 className="text-2xl font-bold text-destructive">Erro ao Carregar</h1>
          <p className="text-muted-foreground">Não foi possível carregar os dados desta Ordem do Dia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
            <div className="flex items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                </svg>
                <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
            </div>
            <div className="ml-auto">
              <Button asChild>
                <Link href="/login">Acessar App</Link>
              </Button>
            </div>
        </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
        <ShootingDayCard 
          day={day} 
          isFetchingWeather={false}
          onEdit={() => {}}
          onDelete={() => {}}
          onShare={() => {}}
          onExportExcel={() => {}}
          onExportPdf={() => {}}
          onUpdateNotes={() => {}}
          isExporting={false}
          isPublicView={true}
        />
      </main>
      <AppFooter />
    </div>
  );
}
