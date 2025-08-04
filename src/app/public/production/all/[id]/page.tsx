// @/src/app/public/production/all/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { Production, ShootingDay } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, LogIn } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion } from '@/components/ui/accordion';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { ProductionInfoCard } from '@/components/production-info-card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export default function PublicProductionPage() {
  const params = useParams();
  const productionId = params.id as string;
  const [production, setProduction] = useState<(Production & { days: ShootingDay[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productionId) {
      firestoreApi.getPublicProduction(productionId)
        .then(fetchedData => {
          if (fetchedData) {
            setProduction(fetchedData);
          } else {
            setError("Produção não encontrada ou não está disponível publicamente.");
          }
        })
        .catch(() => {
          setError("Ocorreu um erro ao carregar os dados.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [productionId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !production) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao Carregar</AlertTitle>
          <AlertDescription>
            {error || "Não foi possível carregar a produção. Verifique o link ou tente novamente mais tarde."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
        <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Criado com:</span>
                <div className="flex items-center gap-1.5">
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="font-semibold tracking-tighter text-foreground" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                </div>
            </div>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild size="sm" className="ml-auto shrink-0">
                            <Link href="/login">
                                <LogIn className="h-4 w-4 md:mr-2"/>
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

      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
        <ProductionInfoCard production={production} />
         <Accordion type="multiple" className="w-full space-y-4 mt-6">
            {production.days.map(day => (
                <ShootingDayCard
                  key={day.id}
                  day={day}
                  production={production}
                  isFetchingWeather={false}
                  isPublicView={true}
                  isExporting={false}
                />
            ))}
        </Accordion>
      </main>
    </div>
  );
}