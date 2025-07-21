// @/src/app/public/day/[publicId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { CopyableError } from '@/components/copyable-error';
import { useToast } from '@/hooks/use-toast';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};


export default function PublicDayPage() {
    const params = useParams();
    const publicId = params.publicId as string;
    const { toast } = useToast();

    const [day, setDay] = useState<ProcessedShootingDay | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [remainingTime, setRemainingTime] = useState('');

    useEffect(() => {
        if (!publicId) return;

        const fetchDay = async () => {
            try {
                const fetchedDay = await firestoreApi.getPublicShootingDay(publicId);
                if (fetchedDay) {
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
                    
                    const processedDay: ProcessedShootingDay = {
                        ...fetchedDay,
                        equipment: convertNotesToItems(fetchedDay.equipment),
                        costumes: convertNotesToItems(fetchedDay.costumes),
                        props: convertNotesToItems(fetchedDay.props),
                        generalNotes: convertNotesToItems(fetchedDay.generalNotes),
                    };

                    setDay(processedDay);
                } else {
                    setError("Ordem do Dia não encontrada ou não é pública.");
                }
            } catch (err: any) {
                console.error("Failed to fetch public day:", err);
                setError("Ocorreu um erro ao carregar os dados.");
                toast({
                  variant: 'destructive',
                  title: 'Erro ao carregar dados públicos',
                  description: <CopyableError userMessage="Não foi possível buscar a Ordem do Dia." errorCode={err.code || err.message} />,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchDay();
    }, [publicId, toast]);

    const handleUpdateNotes = async (
        dayId: string,
        listName: 'equipment' | 'costumes' | 'props' | 'generalNotes',
        updatedList: ChecklistItem[]
    ) => {
        if (!day) return;
        setDay(prev => prev ? { ...prev, [listName]: updatedList } : null);
        try {
            await firestoreApi.updateShootingDay(dayId, { [listName]: updatedList });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Você não tem permissão para editar esta lista.' });
            // Revert state if needed, or simply don't allow it in the first place for public view
        }
    };
    
    if (isLoading) {
        return (
            <div className="p-8 space-y-6 container mx-auto max-w-5xl">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
       return (
         <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
            <div className="w-full max-w-md p-6 mx-4 text-center bg-card border border-destructive rounded-lg shadow-lg">
              <div className="flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <h1 className="mt-4 text-2xl font-bold text-destructive">Acesso Inválido</h1>
              </div>
              <p className="mt-2 text-foreground">{error}</p>
            </div>
          </div>
       );
    }

    if (!day) {
        return null; // Should be covered by error state
    }

    return (
        <div className="bg-muted min-h-screen">
            <main className="container mx-auto max-w-5xl py-8">
                <ShootingDayCard
                    day={day}
                    isFetchingWeather={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onShare={() => {}}
                    onExportExcel={() => {}}
                    onExportPdf={() => {}}
                    onUpdateNotes={handleUpdateNotes}
                    isExporting={false}
                    isPublicView={true}
                />
            </main>
             <footer className="w-full py-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Gerado por <span className="font-semibold text-foreground">ProductionFlow</span>
                </p>
            </footer>
        </div>
    );
}