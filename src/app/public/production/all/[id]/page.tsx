
// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link';

import type { Production, ShootingDay, ChecklistItem } from "@/lib/types";
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from "@/hooks/use-toast";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppFooter } from "@/components/app-footer";
import { ShootingDayCard } from "@/components/shooting-day-card";
import { CopyableError } from "@/components/copyable-error";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

const ProductionInfoCard = ({ production }: { production: Production }) => (
    <Card>
      <CardHeader>
        <CardTitle>{production.name}</CardTitle>
        <CardDescription>{production.type}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-semibold text-foreground">Diretor(a):</span> {production.director}</p>
          {production.responsibleProducer && <p><span className="font-semibold text-foreground">Produtor(a) Responsável:</span> {production.responsibleProducer}</p>}
          {production.producer && <p><span className="font-semibold text-foreground">Produtora:</span> {production.producer}</p>}
          {production.client && <p><span className="font-semibold text-foreground">Cliente:</span> {production.client}</p>}
        </div>
      </CardContent>
    </Card>
);

export default function PublicProductionPage() {
    const params = useParams();
    const productionId = params.id as string;
    const { toast } = useToast();

    const [production, setProduction] = useState<Production | null>(null);
    const [shootingDays, setShootingDays] = useState<ProcessedShootingDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!productionId) return;
        
        const fetchPublicData = async () => {
            setIsLoading(true);
            try {
                const data = await firestoreApi.getPublicProduction(productionId);
                if (data) {
                    setProduction(data);
                    
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

                    const processedDays = (data.days || []).map(day => ({
                      ...day,
                      equipment: convertNotesToItems(day.equipment),
                      costumes: convertNotesToItems(day.costumes),
                      props: convertNotesToItems(day.props),
                      generalNotes: convertNotesToItems(day.generalNotes),
                    }));

                    setShootingDays(processedDays);

                } else {
                    toast({ variant: "destructive", title: "Não encontrado", description: "O link de compartilhamento é inválido ou a produção foi removida." });
                }
            } catch (error) {
                 const errorTyped = error as { code?: string; message: string };
                 toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar dados',
                    description: <CopyableError userMessage="Não foi possível carregar os dados públicos." errorCode={errorTyped.code || errorTyped.message} />,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchPublicData();
    }, [productionId, toast]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[150px] w-full" />
                <div className="space-y-4">
                    <Skeleton className="h-[300px] w-full" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
            </div>
        );
    }
    
    if (!production) {
        return (
             <div className="flex items-center justify-center min-h-screen">
                <p>Produção não encontrada.</p>
             </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                 <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <p>Criado com:</p>
                    <div className="flex items-center gap-1.5">
                        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
                            <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                            <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                        </svg>
                        <p className="text-base font-semibold tracking-tighter text-foreground" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <p className="font-semibold text-muted-foreground">Visualização Pública</p>
                     <Button asChild>
                        <Link href="/login">Acesse a Plataforma</Link>
                    </Button>
                </div>
            </header>
            
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                 <ProductionInfoCard production={production} />

                {shootingDays.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-lg text-muted-foreground">Nenhuma ordem do dia para esta produção ainda.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {shootingDays.map(day => (
                            <ShootingDayCard key={day.id} day={day} production={production} isFetchingWeather={false} isExporting={false} isPublicView={true} />
                        ))}
                    </div>
                )}
            </main>
            <AppFooter />
        </div>
    );
}
