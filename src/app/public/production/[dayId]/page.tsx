
// @/src/app/public/production/[dayId]/page.tsx

'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import type { Production, ShootingDay, ChecklistItem } from "@/lib/types";
import * as firestoreApi from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppFooter } from "@/components/app-footer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion } from "@/components/ui/accordion";
import { ShootingDayCard } from "@/components/shooting-day-card";
import { Skeleton } from "@/components/ui/skeleton";


type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

const ProductionInfoCard = ({ production }: { production: Production }) => (
    <Card className="mb-6">
    <CardHeader>
        <CardTitle>{production.name}</CardTitle>
        <CardDescription>{production.type}</CardDescription>
    </CardHeader>
    <CardContent className="text-base space-y-1">
        <p><span className="font-semibold">Diretor(a):</span> {production.director}</p>
        {production.responsibleProducer && <p><span className="font-semibold">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
        {production.producer && <p><span className="font-semibold">Produtora:</span> {production.producer}</p>}
        {production.client && <p><span className="font-semibold">Cliente:</span> {production.client}</p>}
    </CardContent>
    </Card>
);

export default function PublicShootingDayPage({ params }: { params: { dayId: string } }) {
  const [production, setProduction] = useState<Production | null>(null);
  const [shootingDay, setShootingDay] = useState<ProcessedShootingDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const data = await firestoreApi.getPublicShootingDay(params.dayId);
        if (data) {
           const day = data.day;
           const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
                if (Array.isArray(notes)) { return notes; }
                if (typeof notes === 'string' && notes.trim()) { return notes.split('\n').filter(Boolean).map(line => ({ id: crypto.randomUUID(), text: line.trim(), checked: false }));}
                return [];
            };

          setProduction(data.production);
          setShootingDay({
                ...day,
                equipment: convertNotesToItems(day.equipment),
                costumes: convertNotesToItems(day.costumes),
                props: convertNotesToItems(day.props),
                generalNotes: convertNotesToItems(day.generalNotes),
            });
        } else {
          setError("Ordem do Dia não encontrada ou não é pública.");
        }
      } catch (err) {
        setError("Ocorreu um erro ao carregar os dados.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicData();
  }, [params.dayId]);

  if (isLoading) {
     return (
      <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-48" />
            <div className="ml-auto flex items-center gap-4">
              <Skeleton className="h-8 w-24" />
            </div>
          </header>
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Skeleton className="h-40 w-full mb-6" />
            <Skeleton className="h-64 w-full" />
          </main>
          <AppFooter />
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
              <h1 className="text-xl font-bold">Erro</h1>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Criado com:</span>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                  <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                  <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                </svg>
                <p className="text-lg font-semibold tracking-tighter ml-1" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
              </div>
            </header>
             <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
                 <div className="text-center">
                    <h2 className="text-2xl font-bold text-destructive">Não foi possível carregar a página</h2>
                    <p className="text-muted-foreground mt-2">{error}</p>
                    <Button asChild className="mt-6">
                        <Link href="/login">Acessar Plataforma</Link>
                    </Button>
                </div>
            </main>
             <AppFooter />
        </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Criado com:</span>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                  <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                  <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
              </svg>
              <p className="text-lg font-semibold tracking-tighter ml-1" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
              <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
            </div>
            <div className="ml-auto flex items-center gap-4">
                <h1 className="text-lg font-bold">Visualização Pública</h1>
                 <Button asChild>
                    <Link href="/login">Acessar Plataforma</Link>
                </Button>
            </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {production && <ProductionInfoCard production={production} />}
            {shootingDay && (
                <Accordion type="single" collapsible defaultValue={shootingDay.id} className="w-full">
                    <ShootingDayCard
                        key={shootingDay.id}
                        day={shootingDay}
                        production={production!}
                        isFetchingWeather={false}
                        isExporting={false}
                        isPublicView={true}
                    />
                </Accordion>
            )}
        </main>
        <AppFooter />
    </div>
  );
}
