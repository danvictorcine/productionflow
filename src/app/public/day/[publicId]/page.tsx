
// @/src/app/public/day/[publicId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { ShootingDay, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ShootingDayCard } from '@/components/shooting-day-card';
import { Badge } from '@/components/ui/badge';
import { AppFooter } from '@/components/app-footer';
import { AlertTriangle, Clapperboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { format } from 'date-fns';

type ProcessedShootingDay = Omit<ShootingDay, 'equipment' | 'costumes' | 'props' | 'generalNotes'> & {
    equipment: ChecklistItem[];
    costumes: ChecklistItem[];
    props: ChecklistItem[];
    generalNotes: ChecklistItem[];
};

export default function PublicShootingDayPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const { toast } = useToast();

  const [day, setDay] = useState<ProcessedShootingDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) {
        setIsLoading(false);
        setError("Link de compartilhamento inválido.");
        return;
    }

    const fetchDay = async () => {
        try {
            const fetchedDay = await firestoreApi.getPublicShootingDay(publicId);
            if (!fetchedDay) {
                setError("Ordem do Dia não encontrada ou o compartilhamento foi desativado.");
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

            const processedDay = {
                ...fetchedDay,
                equipment: convertNotesToItems(fetchedDay.equipment),
                costumes: convertNotesToItems(fetchedDay.costumes),
                props: convertNotesToItems(fetchedDay.props),
                generalNotes: convertNotesToItems(fetchedDay.generalNotes),
            };
            setDay(processedDay);

            // Fetch weather if needed
            const weather = fetchedDay.weather;
            const locationMismatch = weather && weather.locationName !== fetchedDay.location;
            const dateMismatch = weather && weather.date !== format(fetchedDay.date, 'yyyy-MM-dd');
            const shouldUpdateWeather = !weather || locationMismatch || dateMismatch;

            if (shouldUpdateWeather && fetchedDay.latitude && fetchedDay.longitude) {
                // Not calling fetchAndUpdateWeather to avoid writing back to DB from a public page
                console.log("Weather needs update, but skipping write from public view.");
            }

        } catch (err: any) {
            setError("Ocorreu um erro ao carregar os dados. Verifique o link e tente novamente.");
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados públicos',
                description: <CopyableError userMessage="Não foi possível buscar os dados." errorCode={err.code || err.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchDay();
  }, [publicId, toast]);

  if (isLoading) {
    return (
        <div className="p-8 space-y-6">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-[300px] w-full" />
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Acesso Negado</h1>
                <p className="text-muted-foreground mt-2 max-w-md">{error}</p>
            </main>
            <AppFooter />
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
        <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
            <div className="flex items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                    <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                </svg>
                <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                 <Badge variant="secondary">Visualização Pública</Badge>
            </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {day ? (
                <ShootingDayCard
                    day={day}
                    isFetchingWeather={false} // No weather fetching on public pages
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onShare={() => {}}
                    onExportExcel={() => {}}
                    onExportPdf={() => {}}
                    onUpdateNotes={() => {}} // Checklists are read-only
                    isExporting={false}
                    isPublicView={true}
                />
            ) : (
                <div className="text-center">
                    <Clapperboard className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Nenhuma Ordem do Dia para exibir.</p>
                </div>
            )}
        </main>
       <AppFooter />
    </div>
  );
}
