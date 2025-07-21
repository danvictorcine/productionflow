// @/src/app/public/storyboard/[publicId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import type { Storyboard, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { AlertCircle, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';

const PanelCard = ({ panel, aspectRatio, index }: { panel: StoryboardPanel; aspectRatio: '16:9' | '4:3'; index: number }) => {
    return (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid">
            <div
                className={cn(
                    "relative w-full rounded-md overflow-hidden bg-muted",
                    aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]"
                )}
            >
                <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" />
                <div className="absolute top-1 left-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none">
                    {index + 1}
                </div>
            </div>
            <Textarea
                readOnly
                value={panel.notes}
                placeholder="Sem anotações."
                rows={3}
                className="text-sm bg-muted/50"
            />
        </div>
    );
};


export default function PublicStoryboardPage() {
    const params = useParams();
    const publicId = params.publicId as string;
    const { toast } = useToast();

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!publicId) return;

        const fetchStoryboard = async () => {
            try {
                const fetchedStoryboard = await firestoreApi.getPublicStoryboard(publicId);
                if (fetchedStoryboard) {
                    setStoryboard(fetchedStoryboard);
                    const fetchedPanels = await firestoreApi.getStoryboardPanels(fetchedStoryboard.id);
                    setPanels(fetchedPanels);
                } else {
                    setError("Storyboard não encontrado ou não é público.");
                }
            } catch (err: any) {
                console.error("Failed to fetch public storyboard:", err);
                setError("Ocorreu um erro ao carregar os dados.");
                 toast({
                  variant: 'destructive',
                  title: 'Erro ao carregar dados públicos',
                  description: <CopyableError userMessage="Não foi possível buscar o storyboard." errorCode={err.code || err.message} />,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchStoryboard();
    }, [publicId, toast]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6 container mx-auto max-w-7xl">
                <Skeleton className="h-24 w-full" />
                <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                </div>
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
    
    if (!storyboard) {
        return null;
    }

    return (
        <div className="bg-muted min-h-screen">
            <main className="container mx-auto max-w-7xl py-8">
                <div className="mb-6">
                    <Card>
                        <CardContent className="p-4 space-y-1">
                            <CardTitle>{storyboard.name}</CardTitle>
                            {storyboard.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {storyboard.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                {panels.length > 0 ? (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                        {panels.map((panel, index) => (
                            <PanelCard
                                key={panel.id}
                                panel={panel}
                                aspectRatio={storyboard.aspectRatio}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                     <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Storyboard Vazio</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Este storyboard ainda não possui quadros.</p>
                    </div>
                )}
            </main>
             <footer className="w-full py-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Gerado por <span className="font-semibold text-foreground">ProductionFlow</span>
                </p>
            </footer>
        </div>
    );
}