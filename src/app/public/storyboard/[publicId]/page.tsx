

// @/src/app/public/storyboard/[publicId]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Image as ImageIcon, FileText } from 'lucide-react';
import Image from 'next/image';

import type { Storyboard, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PublicPanelCard = React.memo(({ panel, aspectRatio, index }: { panel: StoryboardPanel; aspectRatio: '16:9' | '4:3'; index: number }) => {
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
             {panel.notes && (
                <div className="text-sm p-2 bg-muted/50 rounded-md whitespace-pre-wrap">{panel.notes}</div>
            )}
        </div>
    );
});
PublicPanelCard.displayName = 'PublicPanelCard';


export default function PublicStoryboardPage() {
    const params = useParams();
    const publicId = params.publicId as string;
    const { toast } = useToast();

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStoryboardData = useCallback(async () => {
        if (!publicId) return;
        setIsLoading(true);
        try {
            const storyboardData = await firestoreApi.getPublicStoryboard(publicId);
            
            if (storyboardData) {
                const panelsData = await firestoreApi.getStoryboardPanels(storyboardData.id);
                setStoryboard(storyboardData);
                setPanels(panelsData);
            } else {
                notFound();
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar Storyboard',
                description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
            });
             setStoryboard(null); // Set to null on error to show error state
        } finally {
            setIsLoading(false);
        }
    }, [publicId, toast]);

    useEffect(() => { fetchStoryboardData() }, [fetchStoryboardData]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                </div>
            </div>
        );
    }
    
    if (!storyboard) {
        return (
          <div className="flex items-center justify-center min-h-screen text-center">
            <div>
              <h1 className="text-2xl font-bold text-destructive">Erro ao Carregar</h1>
              <p className="text-muted-foreground">Não foi possível carregar os dados deste storyboard.</p>
            </div>
          </div>
        );
      }

    return (
        <div className="flex flex-col min-h-screen w-full bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-2">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
                        <rect width="32" height="32" rx="6" fill="hsl(var(--brand-icon))"/>
                        <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
                    </svg>
                    <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
                    <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
                 <div className="ml-auto">
                    <Button asChild>
                        <Link href="/login">Acessar App</Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
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
                        <PublicPanelCard 
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
                        <p className="mt-2 text-sm text-muted-foreground">Este storyboard ainda não tem nenhum quadro.</p>
                    </div>
                )}
            </main>

            <AppFooter />
        </div>
    );
}
