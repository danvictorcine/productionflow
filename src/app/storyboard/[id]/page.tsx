// @/src/app/storyboard/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, PlusCircle, Image as ImageIcon, Trash2, Loader2, FileText, FileDown, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import update from 'immutability-helper';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
import { cn } from '@/lib/utils';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid"
        >
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
                {!isExporting && (
                  <Button variant="ghost" size="icon" className="absolute top-0.5 right-1 h-7 w-7 text-white/70 hover:text-white hover:bg-black/50" onClick={() => onDelete(panel.id)}>
                      <X className="h-4 w-4" />
                  </Button>
                )}
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
    const exportRef = useRef<HTMLDivElement>(null);

    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [panels, setPanels] = useState<StoryboardPanel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    const dndBackend = typeof navigator !== 'undefined' && /Mobi/i.test(navigator.userAgent) ? TouchBackend : HTML5Backend;

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

    useEffect(() => { fetchStoryboardData() }, [fetchStoryboardData]);
    
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
        
        const files = Array.from(event.target.files);
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            toast({
                variant: 'destructive',
                title: 'Arquivos Muito Grandes',
                description: `Um ou mais arquivos excedem o limite de 10MB.`
            });
            if (imageUploadRef.current) imageUploadRef.current.value = "";
            return;
        }

        setIsUploading(true);

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
            toast({ title: `${files.length} quadro(s) adicionado(s) com sucesso!`});

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
            await fetchStoryboardData(); // Re-fetch to re-evaluate order
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
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar a anotação." errorCode={errorTyped.code || errorTyped.message} />,
            });
            fetchStoryboardData();
        }
    }, [fetchStoryboardData, toast]);

     const movePanel = useCallback((dragIndex: number, hoverIndex: number) => {
        setPanels((prevPanels) =>
            update(prevPanels, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevPanels[dragIndex]],
                ],
            }),
        );
    }, []);

    const handleDropPanel = async () => {
        const updatedPanels = panels.map((panel, index) => ({ id: panel.id, order: index }));
        await firestoreApi.updatePanelOrder(updatedPanels);
        toast({ title: 'Ordem do storyboard salva!' });
    };
    
    const handleExport = async (format: 'pdf' | 'png') => {
        if (!exportRef.current || !storyboard) return;

        toast({ title: "Gerando arquivo...", description: "Isso pode levar alguns segundos." });
        setIsExporting(true);
        
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(exportRef.current!, {
                    useCORS: true,
                    scale: 2,
                    logging: false,
                    backgroundColor: window.getComputedStyle(document.body).backgroundColor,
                    scrollY: -window.scrollY,
                });

                const imgData = canvas.toDataURL('image/png');
                if (format === 'png') {
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = `Storyboard_${storyboard.name.replace(/ /g, "_")}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else { // PDF
                    const pdf = new jsPDF({
                        orientation: 'l', // landscape
                        unit: 'px',
                        format: [canvas.width, canvas.height],
                    });
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
        }, 200);
    };

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
        <DndProvider backend={dndBackend}>
            <div className="flex flex-col min-h-screen w-full bg-muted/40">
                <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
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
                        <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" size="sm">
                          <Edit className="h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">Editar Detalhes</span>
                        </Button>
                        <Button onClick={() => imageUploadRef.current?.click()} disabled={isUploading} size="sm">
                            {isUploading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <PlusCircle className="h-4 w-4 md:mr-2" />}
                            <span className="hidden md:inline">Adicionar Quadro</span>
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
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" disabled={isExporting} aria-label="Exportar Storyboard">
                                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
                                    Exportar como PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('png')} disabled={isExporting}>
                                    Exportar como PNG
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <UserNav />
                    </div>
                </header>
                <main ref={exportRef} className="flex-1 p-4 sm:p-6 md:p-8">
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
                                    onDelete={handleDeletePanel} 
                                    onUpdateNotes={handleUpdatePanelNotes} 
                                    movePanel={movePanel}
                                    onDropPanel={handleDropPanel}
                                    isExporting={isExporting}
                                />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[400px]">
                                <ImageIcon className="mx-auto h-12 w-12 text-primary" />
                                <h3 className="mt-4 text-lg font-semibold">Storyboard Vazio</h3>
                                <p className="mt-2 text-sm text-muted-foreground">Comece adicionando o primeiro quadro ao seu storyboard.</p>
                                <Button className="mt-6" onClick={() => imageUploadRef.current?.click()} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Adicionar Quadro
                                </Button>
                            </div>
                        )}
                         {isExporting && (
                            <div className="mt-8 text-center text-sm text-muted-foreground">
                                Criado com ProductionFlow
                            </div>
                        )}
                    </div>
                </main>

                <AppFooter />

                <CreateEditStoryboardDialog 
                    isOpen={isEditDialogOpen} 
                    setIsOpen={setIsEditDialogOpen} 
                    onSubmit={handleStoryboardSubmit} 
                    storyboard={storyboard}
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
