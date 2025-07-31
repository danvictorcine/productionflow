
// @/src/app/public/production/[dayId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clapperboard } from 'lucide-react';


import type { Production, ShootingDay } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { Badge } from '@/components/ui/badge';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';

const ProductionInfoCard = ({ production }: { production: Production }) => (
    <div className="mb-6 p-4 border rounded-lg bg-card shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight">{production.name}</h2>
        <p className="text-muted-foreground">{production.type}</p>
        <div className="text-base mt-2 space-y-1">
            {production.director && <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>}
            {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
            {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
            {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
        </div>
    </div>
);


function PublicShootingDayPageDetail() {
  const router = useRouter();
  const params = useParams();
  const dayId = params.dayId as string;
  const { toast } = useToast();
  
  const [data, setData] = useState<{production: Production, day: ShootingDay} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!dayId) return;

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await firestoreApi.getPublicShootingDay(dayId);
            if (result) {
                setData(result);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Ordem do Dia não encontrada ou não está mais disponível publicamente.' });
                router.push('/');
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados',
                description: <CopyableError userMessage="Não foi possível carregar os dados da Ordem do Dia." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();
  }, [dayId, router, toast]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!data) {
    return null; 
  }

  const { production, day } = data;

  const convertedDay = {
    ...day,
    equipment: Array.isArray(day.equipment) ? day.equipment : [],
    costumes: Array.isArray(day.costumes) ? day.costumes : [],
    props: Array.isArray(day.props) ? day.props : [],
    generalNotes: Array.isArray(day.generalNotes) ? day.generalNotes : [],
  };


  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Criado com:</span>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
              </svg>
              <p className="text-base font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
              <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
            </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <p className="text-sm font-semibold text-primary hidden md:block">Visualização Pública</p>
             <Button asChild>
                <Link href="/login">Acesse a Plataforma</Link>
            </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <ProductionInfoCard production={production} />

        <Accordion 
          type="single" 
          collapsible 
          className="w-full space-y-4"
          defaultValue={day.id}
        >
          <ShootingDayCard 
            day={convertedDay} 
            production={production}
            isFetchingWeather={false}
            isPublicView={true}
            isExporting={false}
          />
        </Accordion>
      </main>

      <AppFooter />
    </div>
  );
}

export default function PublicShootingDayPage() {
    return <PublicShootingDayPageDetail />
}
