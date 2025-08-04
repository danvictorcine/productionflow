'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductionInfoCard } from '@/components/production-info-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';

export default function PublicShootingDayPage() {
  const params = useParams();
  const dayId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (dayId) {
      firestoreApi.getPublicShootingDay(dayId)
        .then(setData)
        .finally(() => setIsLoading(false));
    }
  }, [dayId]);

  if (isLoading) {
    return (
        <div className="p-8 space-y-6">
            <Skeleton className="h-[60px] w-full" />
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[300px] w-full" />
        </div>
    );
  }

  if (!data) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">Ordem do Dia não encontrada</h1>
        <p className="text-muted-foreground mt-2">O link que você acessou pode estar expirado ou incorreto.</p>
        <Button asChild className="mt-6">
          <Link href="/login">Voltar para o Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
              <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <h1 className="text-lg md:text-xl font-bold">{data.production.name}</h1>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Acessar a Plataforma</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Voltar para a plataforma</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
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
      </main>

      <AppFooter />
    </div>
  );
}
