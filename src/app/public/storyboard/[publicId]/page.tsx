// src/app/public/storyboard/[publicId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import type { Storyboard, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

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
                 <Textarea
                    readOnly
                    value={panel.notes}
                    rows={3}
                    className="text-sm bg-muted/50"
                />
            )}
        </div>
    );
});
PublicPanelCard.displayName = 'PublicPanelCard';

export default function PublicStoryboardPage() {
    const params = useParams();
    const publicId = params.publicId as string;

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
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
                const storyboardData = await firestoreApi.getPublicStoryboard(publicId);
                if (!storyboardData) {
                    setError("Storyboard não encontrado ou não é público.");
                    setIsLoading(false);
                    return;
                }

                const panelsData = await firestoreApi.getPublicStoryboardPanels(storyboardData.id);
                setStoryboard(storyboardData);
                setPanels(panelsData);
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                </div>
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

    if (!storyboard) return null;

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <header className="sticky top-0 z-10 flex h-[60px] items-center justify-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <h1 className="text-xl font-bold text-primary truncate">{storyboard.name}</h1>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <Card className="mb-6">
                        <CardContent className="p-4 space-y-1">
                            <CardTitle>{storyboard.name}</CardTitle>
                            {storyboard.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {storyboard.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
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