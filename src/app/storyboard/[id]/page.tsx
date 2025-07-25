// @/src/app/storyboard/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, PlusCircle, Image as ImageIcon, Trash2, Loader2, FileDown, X, GripVertical } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import update from 'immutability-helper';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import type { Storyboard, StoryboardPanel, StoryboardScene } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/ui/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { CreateEditStoryboardDialog } from '@/components/create-edit-storyboard-dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateEditStoryboardSceneDialog } from '@/components/create-edit-storyboard-scene-dialog';


const ItemType = 'PANEL';

interface PanelCardProps {
  panel: StoryboardPanel;
  aspectRatio: '16:9' | '4:3';
  index: number;
  onDelete: (panelId: string) => void;
  onUpdateNotes: (panelId: string, notes: string) => void;
  movePanel: (dragIndex: number, hoverIndex: number) => void;
  onDropPanel: () => void;
  isExporting: boolean;
}

const PanelCard = React.memo(({ panel, aspectRatio, index, onDelete, onUpdateNotes, movePanel, onDropPanel, isExporting }: PanelCardProps) => {
    const [notes, setNotes] = useState(panel.notes);
    const debounceTimer = useRef<NodeJS.Timeout>();

    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop({
        accept: ItemType,
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(item: { index: number }, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            
            movePanel(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: () => ({ id: panel.id, index }),
        end: (item, monitor) => {
            if (monitor.didDrop()) {
                onDropPanel();
            }
        },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    drag(drop(ref));

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            onUpdateNotes(panel.id, newNotes);
        }, 500);
    };
    
    useEffect(() => { setNotes(panel.notes) }, [panel.notes]);

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            style={{ opacity: isDragging ? 0.3 : 1 }}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid group relative"
        >
            <div
                className={cn(
                    "relative w-full rounded-md overflow-hidden bg-muted",
                    aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]"
                )}
            >
                <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" />
                 <div className="absolute top-1 left-1 bg-black/30 text-white/90 text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none transition-colors opacity-0 group-hover:opacity-100">
                    {index + 1}
                </div>
                {!isExporting && (
                  <Button variant="ghost" size="icon" className="absolute top-0.5 right-1 h-7 w-7 text-white/70 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(panel.id)}>
                      <X className="h-4 w-4" />
                  </Button>
                )}
            </div>
            <Textarea 
                placeholder="Adicione suas anotações aqui..."
                value={notes}
                onChange={handleNotesChange}
                className="text-sm bg-transparent border-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring p-1"
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
    const exportRef = useRef<HTMLDivElement>(null);

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [scenes, setScenes] = useState<StoryboardScene[]>([]);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Dialog states
    const [isStoryboardInfoDialogOpen, setIsStoryboardInfoDialogOpen] = useState(false);
    const [isSceneDialogOpen, setIsSceneDialogOpen] = useState(false);
    const [editingScene, setEditingScene] = useState<StoryboardScene | null>(null);
    
    const dndBackend = typeof navigator !== 'undefined' && /Mobi/i.test(navigator.userAgent) ? TouchBackend : HTML5Backend;

    const fetchStoryboardData = useCallback(async () => {
        if (!storyboardId || !user) return;
        try {
            const [storyboardData, scenesData, panelsData] = await Promise.all([
                firestoreApi.getStoryboard(storyboardId),
                firestoreApi.getStoryboardScenes(storyboardId),
                firestoreApi.getStoryboardPanels(storyboardId),
            ]);

            if (storyboardData) {
                setStoryboard(storyboardData);
                
                // Backward compatibility: If no scenes exist, create one from existing panels
                if (scenesData.length === 0 && panelsData.length > 0) {
                    const newSceneId = await firestoreApi.addStoryboardScene(storyboardId, {
                        title: "Cena 1",
                        description: "Quadros importados do projeto original.",
                    });
                    
                    const panelUpdates = panelsData.map(p => ({ id: p.id, sceneId: newSceneId }));
                    await firestoreApi.updatePanelBatch(panelUpdates);

                    // Re-fetch after migration
                    await fetchStoryboardData();
                    return;
                }

                setScenes(scenesData);
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

    useEffect(() => { fetchStoryboardData() }, [fetchStoryboardData]);
    
    const handleStoryboardSubmit = async (data: Omit<Storyboard, 'id' | 'userId' | 'createdAt'>) => {
        if (!storyboard) return;
        try {
            await firestoreApi.updateStoryboard(storyboard.id, data);
            await fetchStoryboardData();
            setIsStoryboardInfoDialogOpen(false);
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

    const handleSceneSubmit = async (data: Omit<StoryboardScene, 'id' | 'storyboardId' | 'order'>) => {
        try {
            if (editingScene) {
                await firestoreApi.updateStoryboardScene(editingScene.id, data);
                toast({ title: 'Cena atualizada!' });
            } else {
                await firestoreApi.addStoryboardScene(storyboardId, data);
                toast({ title: 'Cena adicionada!' });
            }
            await fetchStoryboardData();
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar cena',
                description: <CopyableError userMessage="Não foi possível salvar a cena." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsSceneDialogOpen(false);
            setEditingScene(null);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, sceneId: string) => {
        if (!event.target.files?.length) return;
        
        const files = Array.from(event.target.files);
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            toast({ variant: 'destructive', title: 'Arquivos Muito Grandes', description: `Um ou mais arquivos excedem o limite de 10MB.` });
            if (imageUploadRef.current) imageUploadRef.current.value = "";
            return;
        }

        setIsUploading(true);

        try {
            const panelsInScene = panels.filter(p => p.sceneId === sceneId).length;
            const newPanelsData = await Promise.all(files.map(async (file, index) => {
                const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
                const imageUrl = await firestoreApi.uploadImageForStoryboard(compressedFile);
                return {
                    storyboardId,
                    sceneId,
                    imageUrl,
                    notes: "",
                    order: panelsInScene + index,
                };
            }));

            await firestoreApi.addStoryboardPanelsBatch(newPanelsData);
            await fetchStoryboardData();
            toast({ title: `${files.length} quadro(s) adicionado(s) com sucesso!`});

        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ variant: 'destructive', title: 'Erro em /storyboard/[id]/page.tsx (handleImageUpload)', description: <CopyableError userMessage="Não foi possível enviar as imagens." errorCode={errorTyped.code || errorTyped.message} /> });
        } finally {
            setIsUploading(false);
            if (imageUploadRef.current) imageUploadRef.current.value = "";
        }
    };
    
    const handleDeletePanel = async (panelId: string) => {
        try {
            await firestoreApi.deleteStoryboardPanel(panelId);
            await fetchStoryboardData();
            toast({ title: 'Painel removido.' });
        } catch (error) {
             const errorTyped = error as { code?: string; message: string };
            toast({ variant: 'destructive', title: 'Erro em /storyboard/[id]/page.tsx (handleDeletePanel)', description: <CopyableError userMessage="Não foi possível remover o painel." errorCode={errorTyped.code || errorTyped.message} /> });
        }
    };
    
    const handleDeleteScene = async (sceneId: string) => {
        try {
            await firestoreApi.deleteStoryboardScene(sceneId, panels.filter(p => p.sceneId === sceneId));
            await fetchStoryboardData();
            toast({ title: 'Cena removida.' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ variant: 'destructive', title: 'Erro ao remover cena', description: <CopyableError userMessage="Não foi possível remover a cena e seus quadros." errorCode={errorTyped.code || errorTyped.message} /> });
        }
    };


    const handleUpdatePanelNotes = useCallback(async (panelId: string, notes: string) => {
        try {
            await firestoreApi.updateStoryboardPanel(panelId, { notes });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: <CopyableError userMessage="Não foi possível salvar a anotação." errorCode={errorTyped.code || errorTyped.message} /> });
            fetchStoryboardData();
        }
    }, [fetchStoryboardData, toast]);

    const movePanel = useCallback((sceneId: string, dragIndex: number, hoverIndex: number) => {
      setPanels((prevPanels) => {
          const scenePanels = prevPanels.filter(p => p.sceneId === sceneId);
          const otherPanels = prevPanels.filter(p => p.sceneId !== sceneId);
          const updatedScenePanels = update(scenePanels, {
              $splice: [[dragIndex, 1], [hoverIndex, 0, scenePanels[dragIndex]]],
          });
          return [...otherPanels, ...updatedScenePanels];
      });
    }, []);

    const handleDropPanel = async (sceneId: string) => {
        const panelsInScene = panels.filter(p => p.sceneId === sceneId);
        const updatedPanels = panelsInScene.map((panel, index) => ({ id: panel.id, order: index }));
        await firestoreApi.updatePanelOrder(updatedPanels);
        toast({ title: 'Ordem da cena salva!' });
    };
    
    const handleExport = async (format: 'pdf' | 'png') => {
        if (!exportRef.current || !storyboard) return;
        toast({ title: "Gerando arquivo...", description: "Isso pode levar alguns segundos." });
        setIsExporting(true);
        
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(exportRef.current!, { useCORS: true, scale: 2, logging: false, backgroundColor: window.getComputedStyle(document.body).backgroundColor, scrollY: -window.scrollY });
                const imgData = canvas.toDataURL('image/png');
                
                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `Storyboard_${storyboard.name.replace(/ /g, "_")}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    const pdf = new jsPDF({ orientation: 'l', unit: 'px', format: [canvas.width, canvas.height] });
                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                    pdf.save(`Storyboard_${storyboard.name.replace(/ /g, "_")}.pdf`);
                }
                toast({ title: "Exportação Concluída!" });
            } catch (error) {
                console.error("Error generating export", error);
                toast({ variant: 'destructive', title: 'Erro ao exportar', description: 'Não foi possível gerar o arquivo.' });
            } finally {
                setIsExporting(false);
            }
        }, 500);
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (!storyboard) return null;

    return (
        <DndProvider backend={dndBackend}>
            <div className="flex flex-col min-h-screen w-full bg-muted/40">
                <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6 shrink-0">
                    <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
                        <Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                            <ImageIcon className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-lg md:text-xl font-bold text-primary truncate">{storyboard.name}</h1>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button onClick={() => setIsStoryboardInfoDialogOpen(true)} variant="outline" size="sm">
                          <Edit className="h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">Editar Projeto</span>
                        </Button>
                        <Button onClick={() => { setEditingScene(null); setIsSceneDialogOpen(true); }} size="sm">
                            <PlusCircle className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Adicionar Cena</span>
                        </Button>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" disabled={isExporting} aria-label="Exportar Storyboard">
                                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>Exportar como PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('png')} disabled={isExporting}>Exportar como PNG</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <UserNav />
                    </div>
                </header>
                 <main className="flex-1 overflow-y-auto">
                    <div ref={exportRef} className="p-4 sm:p-6 md:p-8">
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle>{storyboard.name}</CardTitle>
                                {storyboard.description && (
                                    <CardDescription className="whitespace-pre-wrap pt-1">{storyboard.description}</CardDescription>
                                )}
                            </CardHeader>
                        </Card>
                        <div className="space-y-8">
                            {scenes.map((scene, sceneIndex) => (
                                <Card key={scene.id} className="overflow-hidden">
                                    <CardHeader className="flex-row items-start justify-between">
                                        <div>
                                            <CardTitle className="text-xl">Cena {sceneIndex + 1}: {scene.title}</CardTitle>
                                            {scene.description && <CardDescription className="mt-1">{scene.description}</CardDescription>}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => { setEditingScene(scene); setIsSceneDialogOpen(true); }}>
                                                    <Edit className="mr-2 h-4 w-4" /> Editar Cena
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteScene(scene.id)} className="text-destructive focus:text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Cena
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {(panels.filter(p => p.sceneId === scene.id)).map((panel, index) => (
                                                <PanelCard 
                                                    key={panel.id} 
                                                    panel={panel} 
                                                    aspectRatio={storyboard.aspectRatio}
                                                    index={index} 
                                                    onDelete={handleDeletePanel} 
                                                    onUpdateNotes={handleUpdatePanelNotes} 
                                                    movePanel={(dragIndex, hoverIndex) => movePanel(scene.id, dragIndex, hoverIndex)}
                                                    onDropPanel={() => handleDropPanel(scene.id)}
                                                    isExporting={isExporting}
                                                />
                                            ))}
                                            <button
                                              onClick={() => imageUploadRef.current?.click()}
                                              className={cn("flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:border-primary hover:text-primary transition-colors",
                                              storyboard.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]')}
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    <PlusCircle className="h-8 w-8" />
                                                    <span className="text-sm font-medium">Adicionar Quadro</span>
                                                </div>
                                                <input
                                                  ref={imageUploadRef}
                                                  type="file"
                                                  accept="image/*"
                                                  multiple
                                                  className="hidden"
                                                  onChange={(e) => handleImageUpload(e, scene.id)}
                                                  disabled={isUploading}
                                                />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {scenes.length === 0 && (
                                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">Nenhuma cena criada ainda.</p>
                                    <Button onClick={() => { setEditingScene(null); setIsSceneDialogOpen(true); }} className="mt-4">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      Criar Primeira Cena
                                    </Button>
                                </div>
                            )}
                        </div>
                        {isExporting && ( <div className="mt-8 text-center text-sm text-muted-foreground">Criado com ProductionFlow</div> )}
                    </div>
                </main>
                <AppFooter />
                <CreateEditStoryboardDialog 
                    isOpen={isStoryboardInfoDialogOpen} 
                    setIsOpen={setIsStoryboardInfoDialogOpen} 
                    onSubmit={handleStoryboardSubmit} 
                    storyboard={storyboard}
                />
                <CreateEditStoryboardSceneDialog 
                    isOpen={isSceneDialogOpen}
                    setIsOpen={setIsSceneDialogOpen}
                    onSubmit={handleSceneSubmit}
                    scene={editingScene}
                />
            </div>
        </DndProvider>
    );
}


export default function StoryboardPage() {
    return (
        <AuthGuard>
            <StoryboardPageDetail />
        </AuthGuard>
    );
}
