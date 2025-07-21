// src/app/public/day/[publicId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { Production, ShootingDay, ChecklistItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, Info, Phone, Utensils } from 'lucide-react';
import { Accordion, AccordionTrigger, AccordionItem, AccordionContent } from '@/components/ui/accordion';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

export default function PublicShootingDayPage() {
    const params = useParams();
    const publicId = params.publicId as string;

    const [day, setDay] = useState<ProcessedShootingDay | null>(null);
    const [production, setProduction] = useState<Production | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!publicId) {
            setError("ID inválido.");
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const dayData = await firestoreApi.getPublicShootingDay(publicId);
                if (!dayData) {
                    setError("Ordem do Dia não encontrada ou não é pública.");
                    setIsLoading(false);
                    return;
                }

                const productionData = await firestoreApi.getProductionForDay(dayData.productionId);
                if (!productionData) {
                    setError("Produção associada não encontrada.");
                    setIsLoading(false);
                    return;
                }
                
                const convertNotesToItems = (notes: string | ChecklistItem[] | undefined): ChecklistItem[] => {
                    if (Array.isArray(notes)) return notes;
                    if (typeof notes === 'string' && notes.trim()) {
                        return notes.split('\n').filter(Boolean).map(line => ({ id: crypto.randomUUID(), text: line.trim(), checked: false }));
                    }
                    return [];
                };

                setDay({
                    ...dayData,
                    equipment: convertNotesToItems(dayData.equipment),
                    costumes: convertNotesToItems(dayData.costumes),
                    props: convertNotesToItems(dayData.props),
                    generalNotes: convertNotesToItems(dayData.generalNotes),
                });
                setProduction(productionData);
            } catch (err) {
                console.error(err);
                setError("Ocorreu um erro ao carregar os dados.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [publicId]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    if (!day || !production) return null;

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center justify-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <h1 className="text-xl font-bold text-primary truncate">
                    {production.name} - Ordem do Dia
                </h1>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
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
                    />

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="team">
                            <Card>
                                <AccordionTrigger className="hover:no-underline p-6">
                                    <CardHeader className="p-0 flex-1">
                                        <CardTitle className="flex items-center text-left">
                                            <Users className="h-6 w-6 mr-3 text-primary" />
                                            Equipe e Elenco
                                        </CardTitle>
                                    </CardHeader>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                    <div className="space-y-4">
                                        {production.team.map(member => (
                                            <div key={member.id} className="p-3 rounded-md border bg-muted/50">
                                                <div>
                                                    <p className="font-semibold">{member.name}</p>
                                                    <p className="text-sm text-muted-foreground">{member.role}</p>
                                                </div>
                                                {member.contact && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                                        <Phone className="h-3 w-3" />
                                                        <a href={`tel:${member.contact.replace(/\D/g, '')}`} className="text-muted-foreground hover:underline">{member.contact}</a>
                                                    </div>
                                                )}
                                                {member.hasDietaryRestriction && (
                                                    <div className="mt-1 flex items-center gap-2 text-sm">
                                                        <Utensils className="h-3 w-3" />
                                                        <span className="text-muted-foreground">{member.dietaryRestriction || 'Possui restrição'}</span>
                                                    </div>
                                                )}
                                                {member.extraNotes && (
                                                    <div className="mt-1 flex items-start gap-2 text-sm">
                                                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                        <span className="text-muted-foreground">{member.extraNotes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                </div>
            </main>
            <footer className="w-full border-t py-4 text-center text-sm text-muted-foreground mt-auto">
                Visualizando com{' '}
                <Link href="/" className="font-semibold text-primary hover:underline">
                    ProductionFlow
                </Link>
            </footer>
        </div>
    );
}