// @/src/components/storyboard-page-detail.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlusCircle, Edit, Trash2, MoreVertical, FileDown, Loader2, X, GripVertical, ZoomIn, ZoomOut, FileSpreadsheet } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import type { Storyboard, StoryboardScene, StoryboardPanel } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { CreateEditStoryboardSceneDialog } from '@/components/create-edit-storyboard-scene-dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DEFAULT_BETA_LIMITS } from '@/lib/app-config';
import { useIsMobile } from '@/hooks/use-mobile';
import update from 'immutability-helper';

const ItemType = 'PANEL';

interface PanelCardProps {
  panel: StoryboardPanel;
  aspectRatio: '16:9' | '4:3';
  index: number;
  onDelete: (panelId: string, sceneId: string) => void;
  onUpdateNotes: (panelId: string, notes: string) => void;
  movePanel: (sceneId: string, dragIndex: number, hoverIndex: number) => void;
  onDropPanel: (sceneId: string) => void;
  isExporting: boolean;
}

const PanelCard = React.memo(({ panel, aspectRatio, index, onDelete, onUpdateNotes, movePanel, onDropPanel, isExporting }: PanelCardProps) => {
    const [notes, setNotes] = useState(panel.notes);
    const debounceTimer = useRef<NodeJS.Timeout>();
    const cardRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop({
        accept: ItemType,
        collect(monitor) { return { handlerId: monitor.getHandlerId() }; },
        hover(item: { index: number, sceneId: string }, monitor) {
            if (!cardRef.current || item.sceneId !== panel.sceneId) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            const hoverBoundingRect = cardRef.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            movePanel(panel.sceneId, dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemType,
        item: () => ({ id: panel.id, index, sceneId: panel.sceneId }),
        end: (item, monitor) => { if (monitor.didDrop()) { onDropPanel(panel.sceneId); } },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    drag(handleRef);
    drop(cardRef);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        setNotes(newNotes);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => { onUpdateNotes(panel.id, newNotes); }, 500);
    };
    
    useEffect(() => { setNotes(panel.notes) }, [panel.notes]);

    return (
        <div ref={cardRef} data-handler-id={handlerId} style={{ opacity: isDragging ? 0.3 : 1 }} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid group relative">
             {!isExporting && ( <div ref={handleRef} className="drag-handle absolute top-0 left-1/2 -translate-x-1/2 w-12 h-5 flex items-start justify-center cursor-move z-10 opacity-30 group-hover:opacity-100 transition-opacity"><GripVertical className="h-4 w-4 text-muted-foreground" /></div> )}
            <div className={cn("relative w-full rounded-md overflow-hidden bg-muted", aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]")}>
                <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" data-ai-hint="action sequence" />
                 <div className="absolute top-1 left-1 bg-black/30 text-white/90 text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none transition-colors group-hover:opacity-100">{index + 1}</div>
                {!isExporting && ( <Button variant="ghost" size="icon" className="absolute top-0.5 right-1 h-7 w-7 text-white/70 hover:text-white hover:bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(panel.id, panel.sceneId)}><X className="h-4 w-4" /></Button> )}
            </div>
            <Textarea placeholder="Adicione suas anotações aqui..." value={notes} onChange={handleNotesChange} className="text-base bg-transparent border-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring p-1" readOnly={isExporting} />
        </div>
    );
});
PanelCard.displayName = 'PanelCard';

interface StoryboardPageDetailProps {
    storyboard: Storyboard;
    onDataRefresh: () => void;
}

export default function StoryboardPageDetail({ storyboard, onDataRefresh }: StoryboardPageDetailProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const imageUploadRef = useRef<HTMLInputElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);
    const mainContainerRef = useRef<HTMLDivElement>(null);

    const [scenes, setScenes] = useState<StoryboardScene[]>([]);
    const [panelsByScene, setPanelsByScene] = useState<Record<string, StoryboardPanel[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Dialog states
    const [isSceneDialogOpen, setIsSceneDialogOpen] = useState(false);
    const [editingScene, setEditingScene] = useState<StoryboardScene | null>(null);
    const [sceneToDelete, setSceneToDelete] = useState<StoryboardScene | null>(null);
    const [sceneForUpload, setSceneForUpload] = useState<string | null>(null);
    
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const startPanPoint = useRef({ x: 0, y: 0 });
    const isMobile = useIsMobile();
    const dndBackend = isMobile ? TouchBackend : HTML5Backend;

    const fetchStoryboardSubData = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetchedScenes = await firestoreApi.getStoryboardScenes(storyboard.id);
            setScenes(fetchedScenes);
            const fetchedPanels = await firestoreApi.getStoryboardPanels(storyboard.id);
            const groupedPanels: Record<string, StoryboardPanel[]> = {};
            fetchedScenes.forEach(scene => { groupedPanels[scene.id] = []; });
            fetchedPanels.forEach(panel => {
                if (panel.sceneId && groupedPanels[panel.sceneId]) {
                    groupedPanels[panel.sceneId].push(panel);
                }
            });
            setPanelsByScene(groupedPanels);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar cenas e painéis.' });
        } finally {
            setIsLoading(false);
        }
    }, [storyboard.id, toast]);

    useEffect(() => { fetchStoryboardSubData() }, [fetchStoryboardSubData]);
    
    const handleSceneSubmit = async (data: Omit<StoryboardScene, 'id' | 'storyboardId' | 'userId' | 'order' | 'createdAt'>) => {
        try {
            if (editingScene) {
                await firestoreApi.updateStoryboardScene(editingScene.id, data);
                toast({ title: 'Cena atualizada!' });
            } else {
                await firestoreApi.addStoryboardScene({ ...data, storyboardId: storyboard.id, order: scenes.length });
                toast({ title: 'Cena criada!' });
            }
            fetchStoryboardSubData();
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro ao Salvar Cena' });
        } finally {
            setIsSceneDialogOpen(false);
            setEditingScene(null);
        }
    };

    const handleSceneDelete = async () => {
        if (!sceneToDelete) return;
        try {
            await firestoreApi.deleteStoryboardScene(sceneToDelete.id, sceneToDelete.storyboardId);
            toast({ title: `Cena "${sceneToDelete.title}" excluída.` });
            fetchStoryboardSubData();
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro ao Excluir Cena' });
        } finally {
            setSceneToDelete(null);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length || !sceneForUpload || !user) return;
        
        const files = Array.from(event.target.files);
        const currentPanelCount = panelsByScene[sceneForUpload]?.length || 0;

        if (!user.isAdmin && (currentPanelCount + files.length) > DEFAULT_BETA_LIMITS.MAX_PANELS_PER_STORYBOARD_SCENE) {
             toast({ variant: 'destructive', title: 'Limite de quadros atingido!' });
             if (imageUploadRef.current) imageUploadRef.current.value = "";
             return;
        }

        setIsUploading(true);
        try {
            const existingPanels = panelsByScene[sceneForUpload] || [];
            const newPanelsData = await Promise.all(files.map(async (file, index) => {
                const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
                const imageUrl = await firestoreApi.uploadImageForStoryboard(compressedFile);
                return {
                    storyboardId: storyboard.id,
                    sceneId: sceneForUpload,
                    imageUrl,
                    notes: "",
                    order: existingPanels.length + index,
                };
            }));
            await firestoreApi.addStoryboardPanelsBatch(newPanelsData);
            await fetchStoryboardSubData();
            toast({ title: `${files.length} quadro(s) adicionado(s) com sucesso!`});
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro de Upload' });
        } finally {
            setIsUploading(false);
            setSceneForUpload(null);
            if (imageUploadRef.current) imageUploadRef.current.value = "";
        }
    };
    
    const handleDeletePanel = async (panelId: string, sceneId: string) => {
        try {
            await firestoreApi.deleteStoryboardPanel(panelId);
            setPanelsByScene(prev => ({ ...prev, [sceneId]: prev[sceneId].filter(p => p.id !== panelId) }));
            toast({ title: 'Painel removido.' });
            fetchStoryboardSubData();
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro ao remover' });
        }
    };

    const handleUpdatePanelNotes = useCallback(async (panelId: string, notes: string) => {
        try {
            await firestoreApi.updateStoryboardPanel(panelId, { notes });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Salvar' });
        }
    }, [toast]);

    const movePanel = useCallback((sceneId: string, dragIndex: number, hoverIndex: number) => {
        setPanelsByScene(prev => {
            const scenePanels = prev[sceneId];
            return { ...prev, [sceneId]: update(scenePanels, { $splice: [[dragIndex, 1], [hoverIndex, 0, scenePanels[dragIndex]]] }) };
        });
    }, []);

    const handleDropPanel = async (sceneId: string) => {
        const panelsToUpdate = panelsByScene[sceneId].map((panel, index) => ({ id: panel.id, order: index }));
        await firestoreApi.updatePanelOrder(panelsToUpdate);
        toast({ title: 'Ordem da cena salva!' });
    };
    
    const handleExport = async (format: 'pdf' | 'png') => {
        if (!exportRef.current) return;
        toast({ title: "Gerando arquivo..." });
        setIsExporting(true);
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(exportRef.current!, { useCORS: true, scale: 2, logging: false, backgroundColor: window.getComputedStyle(document.body).backgroundColor });
                const imgData = canvas.toDataURL('image/png');
                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `Storyboard_${storyboard.name.replace(/ /g, "_")}.png`;
                    link.click();
                } else {
                    const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height] });
                    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                    pdf.save(`Storyboard_${storyboard.name.replace(/ /g, "_")}.pdf`);
                }
                toast({ title: "Exportação Concluída!" });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao exportar' });
            } finally {
                setIsExporting(false);
            }
        }, 500);
    };
    
    const handleZoom = (dir: 'in' | 'out') => setScale(s => Math.min(Math.max(0.1, s + (dir === 'in' ? 0.15 : -0.15)), 2));

    if (isLoading) { return <div className="p-8"><Skeleton className="h-64 w-full" /></div>; }

    const desktopView = (
        <div ref={exportRef} className="p-8 space-y-8 min-w-[1200px]">
            {isExporting && ( <div className="p-6 rounded-xl bg-background border shadow-lg mb-8"><h1 className="text-3xl font-bold">{storyboard.name}</h1>{storyboard.description && <p className="text-lg text-muted-foreground mt-1">{storyboard.description}</p>}</div> )}
            {scenes.map((scene) => (
                <div key={scene.id} className="p-6 rounded-xl bg-background/80 backdrop-blur-sm border shadow-lg space-y-4">
                    <div className="flex justify-between items-center">
                        <div><h2 className="text-xl font-bold">{scene.title}</h2><p className="text-muted-foreground">{scene.description}</p></div>
                        {!isExporting && (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditingScene(scene); setIsSceneDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar Cena</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setSceneToDelete(scene)}><Trash2 className="mr-2 h-4 w-4" /> Excluir Cena</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(panelsByScene[scene.id] || []).map((panel, panelIndex) => (
                            <PanelCard key={panel.id} panel={panel} aspectRatio={scene.aspectRatio} index={panelIndex} onDelete={handleDeletePanel} onUpdateNotes={handleUpdatePanelNotes} movePanel={movePanel} onDropPanel={handleDropPanel} isExporting={isExporting} />
                        ))}
                        {!isExporting && (<button className={cn("flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-primary/5 transition-colors", scene.aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]")} onClick={() => { setSceneForUpload(scene.id); imageUploadRef.current?.click(); }} disabled={isUploading}>{isUploading && sceneForUpload === scene.id ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <PlusCircle className="h-8 w-8 text-muted-foreground/50" />}</button>)}
                    </div>
                </div>
            ))}
            {isExporting && ( <div className="mt-8 text-center text-sm text-muted-foreground">Criado com ProductionFlow</div> )}
        </div>
    );

    const mobileView = (
        <div ref={exportRef} className="p-4 space-y-6">
             <div className="p-4 rounded-lg bg-card border"><CardHeader className="p-0"><CardTitle>{storyboard.name}</CardTitle>{storyboard.description && <CardDescription className="whitespace-pre-wrap pt-1">{storyboard.description}</CardDescription>}</CardHeader></div>
            {scenes.map((scene) => (
                <div key={scene.id} className="p-4 rounded-lg bg-card border space-y-4">
                    <div className="flex justify-between items-center">
                        <div><h2 className="text-xl font-bold">{scene.title}</h2>{scene.description && <p className="text-base text-muted-foreground">{scene.description}</p>}</div>
                        {!isExporting && (<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditingScene(scene); setIsSceneDialogOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Editar Cena</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setSceneToDelete(scene)}><Trash2 className="mr-2 h-4 w-4" /> Excluir Cena</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {(panelsByScene[scene.id] || []).map((panel, panelIndex) => (
                            <PanelCard key={panel.id} panel={panel} aspectRatio={scene.aspectRatio} index={panelIndex} onDelete={handleDeletePanel} onUpdateNotes={handleUpdatePanelNotes} movePanel={movePanel} onDropPanel={handleDropPanel} isExporting={isExporting}/>
                        ))}
                        {!isExporting && (<button className={cn("flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-primary/5 transition-colors", scene.aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]")} onClick={() => { setSceneForUpload(scene.id); imageUploadRef.current?.click(); }} disabled={isUploading}>{isUploading && sceneForUpload === scene.id ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <PlusCircle className="h-8 w-8 text-muted-foreground/50" />}</button>)}
                    </div>
                </div>
            ))}
            {isExporting && ( <div className="mt-8 text-center text-sm text-muted-foreground">Criado com ProductionFlow</div> )}
        </div>
    );

    return (
        <DndProvider backend={dndBackend}>
            <div className="flex flex-col h-full w-full bg-muted/40 overflow-hidden">
                <div className="bg-background border-b z-30 shrink-0 p-4">
                     <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={() => { setEditingScene(null); setIsSceneDialogOpen(true); }} size="sm">
                            <PlusCircle className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Adicionar Cena</span>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <FileDown className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">Exportar</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExport('png')}>Exportar como PNG</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>Exportar como PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {!isMobile && (
                            <div className="flex items-center gap-1 ml-auto">
                                <Button variant="outline" size="icon" onClick={() => handleZoom('out')} className="h-9 w-9">
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleZoom('in')} className="h-9 w-9">
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 flex flex-col overflow-auto">{isMobile ? mobileView : desktopView}</div>
                
                <CreateEditStoryboardSceneDialog 
                  isOpen={isSceneDialogOpen} 
                  setIsOpen={setIsSceneDialogOpen} 
                  onSubmit={handleSceneSubmit} 
                  scene={editingScene}
                  defaultAspectRatio={storyboard.aspectRatio}
                />
                <AlertDialog open={!!sceneToDelete} onOpenChange={(open) => !open && setSceneToDelete(null)}>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Cena?</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a cena "{sceneToDelete?.title}"? Todos os quadros dentro dela serão perdidos. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleSceneDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
                <input ref={imageUploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading}/>
            </div>
        </DndProvider>
    );
}
