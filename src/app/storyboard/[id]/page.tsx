// @/src/app/storyboard/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, PlusCircle, Image as ImageIcon, Trash2, Loader2, FileText } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import type { Storyboard, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { CreateEditStoryboardDialog } from '@/components/create-edit-storyboard-dialog';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

const PanelCard = React.memo(({ panel, onDelete, onUpdateNotes }: { panel: StoryboardPanel; onDelete: (panelId: string) => void; onUpdateNotes: (panelId: string, notes: string) => void; }) => {
    const [notes, setNotes] = useState(panel.notes);
    const debounceTimer = useRef<NodeJS.Timeout>();

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            onUpdateNotes(panel.id, newNotes);
        }, 500); // 500ms debounce
    };
    
    useEffect(() => {
        setNotes(panel.notes);
    }, [panel.notes]);

    return (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid">
            <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted">
                <Image src={panel.imageUrl} alt={`Storyboard panel ${panel.order + 1}`} layout="fill" objectFit="contain" />
                <div className="absolute top-1 right-1 flex gap-1">
                    <Button variant="destructive" size="icon" className="h-7 w-7 opacity-80 hover:opacity-100" onClick={() => onDelete(panel.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <Textarea 
                placeholder="Adicione suas anotações aqui..."
                value={notes}
                onChange={handleNotesChange}
                rows={3}
                className="text-sm"
            />
        </div>
    );
});
PanelCard.displayName = 'PanelCard';


function StoryboardPageDetail() {
    const router = useRouter();
    const params = useParams();
    const storyboardId = params.id as string;
    const { user } = useAuth();
    const { toast } = useToast();
    const imageUploadRef = useRef<HTMLInputElement>(null);

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const fetchStoryboardData = useCallback(async () => {
        if (!storyboardId || !user) return;
        try {
            const [storyboardData, panelsData] = await Promise.all([
                firestoreApi.getStoryboard(storyboardId),
                firestoreApi.getStoryboardPanels(storyboardId),
            ]);

            if (storyboardData) {
                setStoryboard(storyboardData);
                setPanels(panelsData);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Storyboard não encontrado.' });
                router.push('/');
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /storyboard/[id]/page.tsx (fetchData)',
                description: <CopyableError userMessage="Não foi possível carregar os dados do storyboard." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [storyboardId, user, toast, router]);

    useEffect(() => {
        fetchStoryboardData();
    }, [fetchStoryboardData]);
    
    const handleStoryboardSubmit = async (data: Omit<Storyboard, 'id' | 'userId' | 'createdAt'>) => {
        if (!storyboard) return;
        try {
            await firestoreApi.updateStoryboard(storyboard.id, data);
            await fetchStoryboardData();
            setIsEditDialogOpen(false);
            toast({ title: 'Storyboard atualizado com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /storyboard/[id]/page.tsx (handleStoryboardSubmit)',
                description: <CopyableError userMessage="Não foi possível atualizar o storyboard." errorCode={errorTyped.code || errorTyped.message} />,
            });
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return;
        
        setIsUploading(true);
        const files = Array.from(event.target.files);

        try {
            const newPanelsData = await Promise.all(files.map(async (file, index) => {
                const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
                const imageUrl = await firestoreApi.uploadImageForStoryboard(compressedFile);
                return {
                    storyboardId,
                    imageUrl,
                    notes: "",
                    order: panels.length + index,
                };
            }));

            await firestoreApi.addStoryboardPanelsBatch(newPanelsData);
            await fetchStoryboardData();
            toast({ title: `${files.length} painel(s) adicionado(s) com sucesso!`});

        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /storyboard/[id]/page.tsx (handleImageUpload)',
                description: <CopyableError userMessage="Não foi possível enviar as imagens." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsUploading(false);
            if (imageUploadRef.current) imageUploadRef.current.value = "";
        }
    };
    
    const handleDeletePanel = async (panelId: string) => {
        try {
            await firestoreApi.deleteStoryboardPanel(panelId);
            setPanels(prev => prev.filter(p => p.id !== panelId));
            toast({ title: 'Painel removido.' });
        } catch (error) {
             const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /storyboard/[id]/page.tsx (handleDeletePanel)',
                description: <CopyableError userMessage="Não foi possível remover o painel." errorCode={errorTyped.code || errorTyped.message} />,
            });
        }
    };

    const handleUpdatePanelNotes = useCallback(async (panelId: string, notes: string) => {
        try {
            await firestoreApi.updateStoryboardPanel(panelId, { notes });
            // Optimistic update is handled locally, no need to show toast unless there's an error
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar a anotação." errorCode={errorTyped.code || errorTyped.message} />,
            });
            fetchStoryboardData(); // Re-fetch to correct state on error
        }
    }, [fetchStoryboardData, toast]);

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
    
    if (!storyboard) return null;

    return (
        <div className="flex flex-col min-h-screen w-full bg-muted/40">
            <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
                    <Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                        <ImageIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-primary truncate">{storyboard.name}</h1>
                        {storyboard.description && <p className="text-sm text-muted-foreground">{storyboard.description}</p>}
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Button onClick={() => setIsEditDialogOpen(true)} variant="outline"><Edit className="mr-2 h-4 w-4" />Editar Detalhes</Button>
                    <Button onClick={() => imageUploadRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Adicionar Painel
                    </Button>
                     <input
                        ref={imageUploadRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                    />
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                {panels.length > 0 ? (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                        {panels.map((panel, index) => (
                           <PanelCard key={panel.id} panel={{...panel, order: index}} onDelete={handleDeletePanel} onUpdateNotes={handleUpdatePanelNotes} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Storyboard Vazio</h3>
                        <p className="mt-2 text-sm text-muted-foreground">Comece adicionando o primeiro painel ao seu storyboard.</p>
                        <Button className="mt-6" onClick={() => imageUploadRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Adicionar Painel
                        </Button>
                    </div>
                )}
            </main>

            <AppFooter />

            <CreateEditStoryboardDialog 
                isOpen={isEditDialogOpen} 
                setIsOpen={setIsEditDialogOpen} 
                onSubmit={handleStoryboardSubmit} 
                storyboard={storyboard}
            />
        </div>
    );
}


export default function StoryboardPage() {
    return (
        <AuthGuard>
            <StoryboardPageDetail />
        </AuthGuard>
    );
}
