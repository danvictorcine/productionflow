

// @/src/app/public/storyboard/[publicId]/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import type { Storyboard, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


interface PanelCardProps {
  panel: StoryboardPanel;
  aspectRatio: '16:9' | '4:3';
  index: number;
}

const PanelCard = React.memo(({ panel, aspectRatio, index }: PanelCardProps) => {
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
                    placeholder="Anotações..."
                    value={panel.notes}
                    readOnly
                    rows={3}
                    className="text-sm bg-muted/50"
                />
            )}
        </div>
    );
});
PanelCard.displayName = 'PanelCard';


export default function PublicStoryboardPage() {
    const params = useParams();
    const publicId = params.publicId as string;

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!publicId) return;

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const storyboardData = await firestoreApi.getPublicStoryboard(publicId);
                
                if (!storyboardData) {
                    setError("Este storyboard não foi encontrado ou o acesso não é mais público.");
                    return;
                }
                
                setStoryboard(storyboardData);

                const panelsData = await firestoreApi.getStoryboardPanels(storyboardData.id);
                setPanels(panelsData);

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
                <div className="space-y-6">
                    <Skeleton className="h-[100px] w-full" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64" />)}
                    </div>
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

        if (storyboard) {
            return (
                 <div>
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
                        <div className="text-center text-muted-foreground py-16">
                            <p>Este storyboard ainda não possui quadros.</p>
                        </div>
                    )}
                </div>
            )
        }
        return null;
    }
    
    return (
        <div className="flex flex-col min-h-screen w-full bg-muted/40">
            <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <div className="flex items-center gap-3">
                    <ImageIcon className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold text-primary truncate">{storyboard?.name || "Storyboard"}</h1>
                </div>
                 <div className="ml-auto flex items-center gap-2">
                    <Badge variant="secondary">Visualização Pública</Badge>
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                {renderContent()}
            </main>
            <AppFooter />
        </div>
    );
}

