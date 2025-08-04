
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { Production, ShootingDay } from "@/lib/types";
import * as firestoreApi from "@/lib/firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Accordion } from "@/components/ui/accordion";
import { ShootingDayCard } from "@/components/shooting-day-card";
import { ProductionInfoCard } from "@/components/production-info-card";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function PublicShootingDayPage() {
  const params = useParams();
  const { toast } = useToast();

  const [data, setData] = useState<{ production: Production, day: ShootingDay } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDay = async () => {
      setIsLoading(true);
      try {
        const fetchedData = await firestoreApi.getPublicShootingDay(params.id as string);
        if (fetchedData) {
          setData(fetchedData);
        } else {
          toast({ variant: "destructive", title: "Ordem do Dia não encontrada", description: "O link pode estar incorreto ou a página foi removida." });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Erro ao carregar", description: "Não foi possível carregar os dados da Ordem do Dia." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchDay();
  }, [params.id, toast]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando Ordem do Dia...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen">Ordem do Dia não encontrada.</div>;
  }

  const { production, day } = data;

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <div className="flex items-center justify-center flex-1 gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <h1 className="text-lg md:text-xl font-bold">{production.name}</h1>
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

      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-6xl mx-auto">
        <ProductionInfoCard production={production} />

        <Accordion type="single" collapsible defaultValue={day.id} className="w-full space-y-4 mt-6">
          <ShootingDayCard
            day={day}
            production={production}
            isFetchingWeather={false}
            isPublicView={true}
            isExporting={false}
          />
        </Accordion>
      </main>
    </div>
  );
}
