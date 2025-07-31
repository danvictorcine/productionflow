
// @/src/app/public/production/all/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';

import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

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

export default function PublicProductionPage() {
    const params = useParams();
    const productionId = params.id as string;
    const { toast } = useToast();

    const [data, setData] = useState<{ production: Production; days: ProcessedShootingDay[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!productionId) return;

        const fetchData = async () => {
            try {
                const fetchedData = await firestoreApi.getPublicProduction(productionId);
                if (!fetchedData) {
                    notFound();
                    return;
                }

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

                const processedDays = fetchedData.days.map(day => ({
                    ...day,
                    equipment: convertNotesToItems(day.equipment),
                    costumes: convertNotesToItems(day.costumes),
                    props: convertNotesToItems(day.props),
                    generalNotes: convertNotesToItems(day.generalNotes),
                }));
                
                setData({ production: fetchedData, days: processedDays });

            } catch (error) {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao Carregar',
                    description: <CopyableError userMessage="Não foi possível carregar os dados da produção." errorCode={errorTyped.code || 'UNKNOWN_FETCH_ERROR'} />,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [productionId, toast]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <div className="space-y-6">
                    <Skeleton className="h-[300px] w-full" />
                    <Skeleton className="h-[300px] w-full" />
                </div>
            </div>
        );
    }

    if (!data) {
        return notFound();
    }

    const { production, days } = data;

    return (
        <div className="flex flex-col min-h-screen w-full bg-background">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-x-3 text-muted-foreground">
                    <span className="text-sm">Criado com:</span>
                    <div className="flex items-center gap-1.5">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                            <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                            <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                        </svg>
                        <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    <h1 className="text-lg font-bold text-muted-foreground">Visualização Pública</h1>
                     <Button asChild>
                        <Link href="/login">Acesse a Plataforma</Link>
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <ProductionInfoCard production={production} />

                 <Accordion 
                    type="multiple" 
                    className="w-full space-y-4"
                >
                    <AccordionItem value="team" className="border-none">
                        <Card>
                             <AccordionTrigger className="w-full hover:no-underline p-0 [&>svg]:mr-6">
                                <CardHeader className="flex-1">
                                    <CardTitle className="flex items-center text-left">
                                        <Users className="h-6 w-6 mr-3 text-primary" />
                                        Equipe e Elenco
                                    </CardTitle>
                                    <CardDescription className="text-left">
                                        Informações detalhadas sobre todos os envolvidos na produção.
                                    </CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0">
                                <div className="space-y-4">
                                {(production.team && production.team.length > 0) ? (
                                    production.team.map(member => (
                                        <div key={member.id} className="p-3 rounded-md border bg-muted/50">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-base">{member.name}</p>
                                                    <p className="text-base text-muted-foreground">{member.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro da equipe cadastrado.</p>
                                )}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>
                <div className="mt-4">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {days.map(day => (
                            <ShootingDayCard 
                                key={day.id}
                                day={day}
                                production={production}
                                isFetchingWeather={false}
                                isExporting={false}
                                isPublicView={true}
                            />
                        ))}
                    </Accordion>
                </div>
            </main>
            <AppFooter />
        </div>
    );
}
