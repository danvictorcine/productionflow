
// @/app/public/storyboard/[publicId]/page.tsx
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import type { Storyboard, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { PanelCard } from '@/components/storyboard-panel-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PublicPageHeader } from '@/components/public-page-header';
import { PublicPageView } from '@/components/public-page-view';

async function getStoryboardData(publicId: string): Promise<{ storyboard: Storyboard; panels: StoryboardPanel[] } | null> {
    const storyboard = await firestoreApi.getPublicStoryboard(publicId);
    if (!storyboard) {
        return null;
    }
    const panels = await firestoreApi.getStoryboardPanels(storyboard.id);
    return { storyboard, panels };
}

export default async function PublicStoryboardPage({ params }: { params: { publicId: string } }) {
    const data = await getStoryboardData(params.publicId);

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted">
                <Alert variant="destructive" className="max-w-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro de Acesso</AlertTitle>
                    <AlertDescription>
                        Ocorreu um erro ao carregar os dados. Este link pode ser inválido, privado ou ter sido excluído.
                        Verifique o link e tente novamente.
                        <Button asChild variant="secondary" className="mt-4 w-full">
                           <Link href="/login">Voltar para ProductionFlow</Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const { storyboard, panels } = data;
    
    // This is not a real interactive DND provider, just for layout purposes on the public page.
    // The components expect to be within the provider.
    const dndBackend = HTML5Backend; 

    return (
        <PublicPageView>
            <div className="mx-auto w-full max-w-7xl">
                <DndProvider backend={dndBackend}>
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
                                 isPublicView={true}
                               />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            Este storyboard ainda não possui quadros.
                        </div>
                    )}
                </DndProvider>
            </div>
        </PublicPageView>
    );
}

