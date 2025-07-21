// @/src/app/public/storyboard/[publicId]/page.tsx

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Image as ImageIcon } from 'lucide-react';

import * as firestoreApi from '@/lib/firebase/firestore';
import type { Storyboard, StoryboardPanel } from '@/lib/types';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  params: { publicId: string };
};

// This function generates metadata for the page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const storyboard = await firestoreApi.getPublicStoryboard(params.publicId);
  const title = storyboard ? `Storyboard: ${storyboard.name}` : 'Storyboard não encontrado';
  const description = storyboard?.description || 'Visualize este storyboard público.';

  return {
    title: `${title} | ProductionFlow`,
    description,
  };
}

const PublicPanelCard = ({ panel, aspectRatio, index }: { panel: StoryboardPanel; aspectRatio: '16:9' | '4:3'; index: number }) => {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid">
        <div className={cn("relative w-full rounded-md overflow-hidden bg-muted", aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]")}>
            <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" />
            <div className="absolute top-1 left-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none">
                {index + 1}
            </div>
        </div>
        {panel.notes && (
            <p className="text-sm text-muted-foreground p-1 whitespace-pre-wrap">{panel.notes}</p>
        )}
    </div>
  );
};

export default async function PublicStoryboardPage({ params }: Props) {
  const storyboard = await firestoreApi.getPublicStoryboard(params.publicId);

  if (!storyboard) {
    notFound();
  }

  const panels = await firestoreApi.getStoryboardPanels(storyboard.id);

  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40">
        <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                    <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold text-primary truncate">{storyboard.name}</h1>
            </div>
            <div className="ml-auto">
                 <Button asChild>
                    <Link href="/login">Criado com ProductionFlow</Link>
                </Button>
            </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <Card>
                    <CardContent className="p-4 space-y-1">
                        <CardTitle>{storyboard.name}</CardTitle>
                        {storyboard.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{storyboard.description}</p>
                        )}
                         <p className="text-xs text-muted-foreground pt-1">Proporção: {storyboard.aspectRatio}</p>
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
                    <h3 className="mt-4 text-lg font-semibold">Storyboard Vazio</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Este storyboard ainda não tem nenhum quadro.</p>
                </div>
            )}
        </main>
        
        <AppFooter />
    </div>
  );
}
