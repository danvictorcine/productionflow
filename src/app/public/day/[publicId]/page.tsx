

// @/src/app/public/day/[publicId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clapperboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';


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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!publicId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const fetchedDay = await firestoreApi.getPublicShootingDay(publicId);
                if (!fetchedDay) {
                    setError("Esta Ordem do Dia não foi encontrada ou o acesso não é mais público.");
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

                const processedDay: ProcessedShootingDay = {
                    ...fetchedDay,
                    equipment: convertNotesToItems(fetchedDay.equipment),
                    costumes: convertNotesToItems(fetchedDay.costumes),
                    props: convertNotesToItems(fetchedDay.props),
                    generalNotes: convertNotesToItems(fetchedDay.generalNotes),
                };

                setDay(processedDay);
            } catch (err: any) {
                console.error(err);
                setError("Ocorreu um erro ao carregar os dados. Verifique o link e tente novamente.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [publicId]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="p-8 space-y-6">
                    <Skeleton className="h-[60px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            );
        }

        if (error) {
            return (
                <Alert variant="destructive" className="max-w-xl mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Acesso</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }

        if (day) {
            return (
                 <ShootingDayCard 
                    key={day.id} 
                    day={day} 
                    isFetchingWeather={false}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onShare={() => {}}
                    onExportExcel={() => {}}
                    onExportPdf={() => {}}
                    onUpdateNotes={() => {}}
                    isExporting={false}
                    isPublicView={true}
                  />
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
             <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-2">
                    <Clapperboard className="h-8 w-8 text-primary" />
                    <h1 className="text-xl font-bold">Ordem do Dia</h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary">Visualização Pública</Badge>
                </div>
            </header>
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {renderContent()}
            </main>
            <AppFooter />
        </div>
    );
}
