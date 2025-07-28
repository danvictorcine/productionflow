
// @/src/app/public/production/[dayId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Badge } from '@/components/ui/badge';

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

export default function PublicShootingDayPage() {
  const params = useParams();
  const dayId = params.dayId as string;

  const [production, setProduction] = useState<Production | null>(null);
  const [shootingDay, setShootingDay] = useState<ProcessedShootingDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dayId) return;

    const fetchPublicData = async () => {
      try {
        const data = await firestoreApi.getPublicShootingDay(dayId);
        if (data) {
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
              ...data.day,
              equipment: convertNotesToItems(data.day.equipment),
              costumes: convertNotesToItems(data.day.costumes),
              props: convertNotesToItems(data.day.props),
              generalNotes: convertNotesToItems(data.day.generalNotes),
            };

          setProduction(data.production);
          setShootingDay(processedDay);
        } else {
          setError('Ordem do Dia não encontrada ou o link é inválido.');
        }
      } catch (e) {
        console.error(e);
        setError('Ocorreu um erro ao carregar os dados.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicData();
  }, [dayId]);
  
   const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-8 space-y-6">
          <Skeleton className="h-[150px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center p-8 max-w-md bg-card border border-destructive rounded-lg">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h1 className="mt-4 text-2xl font-bold">Erro ao Carregar</h1>
                    <p className="mt-2 text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    if (!production || !shootingDay) {
        return null;
    }

    return (
      <>
        <ProductionInfoCard production={production} />
        <Accordion type="single" collapsible defaultValue={shootingDay.id} className="w-full">
            <ShootingDayCard
                day={shootingDay}
                production={production}
                isFetchingWeather={false}
                isExporting={false}
                isPublicView={true}
            />
        </Accordion>
      </>
    );
  };

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
             <h1 className="text-lg font-bold text-primary truncate hidden md:block">Visualização Pública</h1>
          </div>
        </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderContent()}
      </main>
      <AppFooter />
    </div>
  );
}
