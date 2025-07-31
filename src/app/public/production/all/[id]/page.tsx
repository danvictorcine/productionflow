// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Clapperboard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';


type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

export default function PublicProductionPage() {
  const params = useParams();
  const productionId = params.id as string;
  const { toast } = useToast();

  const [production, setProduction] = useState<(Production & { days: ProcessedShootingDay[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productionId) {
      setIsLoading(false);
      return;
    }
    
    const fetchProduction = async () => {
      try {
        const data = await firestoreApi.getPublicProduction(productionId);
        if (data) {
          const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
            if (Array.isArray(notes)) return notes;
            if (typeof notes === 'string' && notes.trim()) {
              return notes.split('\n').filter(Boolean).map(line => ({ id: crypto.randomUUID(), text: line.trim(), checked: false }));
            }
            return [];
          };

          const processedDays = data.days.map(day => ({
            ...day,
            equipment: convertNotesToItems(day.equipment),
            costumes: convertNotesToItems(day.costumes),
            props: convertNotesToItems(day.props),
            generalNotes: convertNotesToItems(day.generalNotes),
          }));

          setProduction({ ...data, days: processedDays });
        }
      } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar produção',
          description: <CopyableError userMessage="Não foi possível encontrar os dados desta produção." errorCode={errorTyped.code || errorTyped.message} />,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduction();
  }, [productionId, toast]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (!production) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <div>
          <h2 className="text-2xl font-semibold">Produção não encontrada</h2>
          <p className="text-muted-foreground mt-2">O link pode estar quebrado ou a produção pode ter sido removida.</p>
           <Button asChild className="mt-6">
                <Link href="/login">Voltar para o Login</Link>
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
         <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Criado com:</span>
          <div className="flex items-center gap-1">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
              <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <p className="text-base font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <h1 className="text-sm font-bold text-muted-foreground hidden md:block">Visualização Pública</h1>
            <Button asChild size="sm">
                <Link href="/login">Acesse a Plataforma</Link>
            </Button>
        </div>
      </header>

       <main className="flex-1 p-4 sm:p-6 md:p-8">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold tracking-tight">{production.name}</CardTitle>
                    <CardDescription>{production.type}</CardDescription>
                </CardHeader>
            </Card>

            <h2 className="text-2xl font-bold tracking-tight mb-4">Ordens do Dia</h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
                {production.days.length > 0 ? (
                    production.days.map(day => (
                        <ShootingDayCard
                            key={day.id}
                            day={day}
                            production={production}
                            isFetchingWeather={false}
                            isExporting={false}
                            isPublicView={true}
                        />
                    ))
                ) : (
                    <div className="text-center p-12 border-2 border-dashed rounded-lg">
                        <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Nenhuma Ordem do Dia</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Não há Ordens do Dia disponíveis para esta produção ainda.</p>
                    </div>
                )}
            </Accordion>
       </main>
       <AppFooter />
    </div>
  );
}
