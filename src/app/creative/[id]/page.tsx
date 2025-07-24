
// @/src/app/creative/[id]/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brush, Edit, Trash2, Image as ImageIcon, Video, MapPin, Loader2, GripVertical, FileText, ListTodo, Palette, Plus, File as FileIcon, X } from 'lucide-react';
import { Rnd } from 'react-rnd';
import imageCompression from 'browser-image-compression';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

import type { CreativeProject, BoardItem, ChecklistItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import AdminGuard from '@/components/admin-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { CreateEditCreativeProjectDialog } from '@/components/create-edit-creative-project-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const DisplayMap = dynamic(() => import('@/components/display-map').then(mod => mod.DisplayMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const LocationPicker = dynamic(() => import('@/components/location-picker').then(mod => mod.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

const QuillEditor = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-b-md" />
});


const getYoutubeEmbedUrl = (url: string) => {
    let videoId;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    videoId = match ? match[1] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const getVimeoEmbedUrl = (url: string) => {
    const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/;
    const match = url.match(vimeoRegex);
    const videoId = match ? match[1] : null;
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
};

const BoardItemDisplay = React.memo(({ item, onDelete, onUpdate }: { item: BoardItem; onDelete: (id: string) => void; onUpdate: (id: string, data: Partial<BoardItem>) => void }) => {
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(true);

    useEffect(() => {
        let objectUrl: string;
        if (item.type === 'pdf') {
            setIsLoadingPdf(true);
            fetch(item.content)
                .then(res => res.blob())
                .then(blob => {
                    objectUrl = URL.createObjectURL(blob);
                    setPdfFileUrl(objectUrl);
                })
                .catch(err => {
                    console.error("Failed to fetch PDF blob", err);
                })
                .finally(() => {
                    setIsLoadingPdf(false);
                });
        }
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [item.type, item.content]);


    const noteModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, {'list': 'bullet'}],
                [{ 'align': [] }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ],
        },
    }), []);

    const handleChecklistUpdate = (updatedItems: ChecklistItem[]) => {
        onUpdate(item.id, { items: updatedItems });
    };

    const handlePaletteUpdate = (updatedColors: string[]) => {
        onUpdate(item.id, { content: JSON.stringify(updatedColors) });
    };
    
    const renderContent = () => {
        switch (item.type) {
            case 'note':
                return (
                    <QuillEditor
                        theme="snow"
                        value={item.content}
                        onChange={(content) => onUpdate(item.id, { content })}
                        modules={noteModules}
                        className="h-full w-full"
                    />
                );
            case 'checklist': {
                const title = item.content;
                const items = item.items || [];
                return (
                    <div className="p-3 flex flex-col h-full bg-background">
                       <Input 
                         defaultValue={title}
                         onBlur={(e) => onUpdate(item.id, { content: e.target.value })}
                         placeholder="Título da Lista"
                         className="font-bold border-none focus-visible:ring-0 text-base mb-2"
                       />
                       <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                           {items.map((checklistItem, index) => (
                               <div key={checklistItem.id} className="flex items-center gap-2 group">
                                   <Checkbox
                                     checked={checklistItem.checked}
                                     onCheckedChange={(checked) => {
                                         const newItems = [...items];
                                         newItems[index].checked = !!checked;
                                         handleChecklistUpdate(newItems);
                                     }}
                                   />
                                   <Input
                                     defaultValue={checklistItem.text}
                                     onBlur={(e) => {
                                         const newItems = [...items];
                                         newItems[index].text = e.target.value;
                                         handleChecklistUpdate(newItems);
                                     }}
                                     className="flex-1 h-8 border-none focus-visible:ring-0 focus:bg-muted/50"
                                     placeholder="Novo item..."
                                   />
                                   <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[empty=true]:opacity-0" data-empty={!checklistItem.text} onClick={() => {
                                       const newItems = items.filter(i => i.id !== checklistItem.id);
                                       handleChecklistUpdate(newItems);
                                   }}>
                                       <Trash2 className="h-3 w-3 text-destructive" />
                                   </Button>
                               </div>
                           ))}
                       </div>
                       <Button variant="ghost" size="sm" className="mt-2 justify-start" onClick={() => {
                           const newItems = [...items, { id: crypto.randomUUID(), text: '', checked: false }];
                           handleChecklistUpdate(newItems);
                       }}>
                           <Plus className="mr-2 h-4 w-4" /> Adicionar item
                       </Button>
                    </div>
                )
            }
            case 'palette': {
                let colors: string[] = [];
                try {
                    if (typeof item.content === 'string' && item.content.startsWith('[')) {
                        const parsed = JSON.parse(item.content);
                        if (Array.isArray(parsed)) {
                            colors = parsed.filter(c => typeof c === 'string');
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse palette content, rendering an empty palette.", e);
                }

                return (
                    <div className="p-2 flex flex-col h-full bg-background">
                       <div className="flex-1 grid grid-cols-4 gap-2">
                           {colors.map((color, index) => (
                               <div key={index} className="relative group rounded flex items-center justify-center" style={{ backgroundColor: color }}>
                                   <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => {
                                       const newColors = colors.filter((_, i) => i !== index);
                                       handlePaletteUpdate(newColors);
                                   }}>
                                     <Trash2 className="h-3 w-3 mix-blend-difference" />
                                   </Button>
                               </div>
                           ))}
                           <button onClick={() => colorInputRef.current?.click()} className="rounded border-2 border-dashed flex items-center justify-center hover:bg-muted">
                               <Plus className="h-6 w-6 text-muted-foreground"/>
                               <input ref={colorInputRef} type="color" className="hidden" onChange={(e) => {
                                   handlePaletteUpdate([...colors, e.target.value]);
                               }}/>
                           </button>
                       </div>
                    </div>
                );
            }
            case 'image':
                return <img src={item.content} alt="Moodboard item" className="w-full h-full object-cover" data-ai-hint="abstract texture"/>;
            case 'pdf':
                if (isLoadingPdf) {
                    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>;
                }
                if (pdfFileUrl) {
                    return <iframe src={pdfFileUrl} title={`PDF Viewer - ${item.id}`} className="w-full h-full" />;
                }
                return (
                    <div className="p-2 text-red-500 text-xs flex flex-col items-center justify-center h-full text-center">
                        <p>Falha ao carregar PDF.</p>
                        <p className="text-muted-foreground text-xs">O arquivo pode estar corrompido ou o formato não é suportado.</p>
                    </div>
                );
            case 'video':
                 const youtubeUrl = getYoutubeEmbedUrl(item.content);
                 const vimeoUrl = getVimeoEmbedUrl(item.content);
                 const embedUrl = youtubeUrl || vimeoUrl;
                 if (embedUrl) {
                     return <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen></iframe>;
                 }
                 return <div className="p-2 text-red-500 text-xs">Link de vídeo inválido ou não suportado. Use links do YouTube ou Vimeo.</div>;
            case 'location':
                const locationData = JSON.parse(item.content);
                return (
                    <div className="w-full h-full flex flex-col">
                        <div className="bg-muted text-muted-foreground text-xs p-1 truncate">{locationData.name}</div>
                        <DisplayMap position={[locationData.lat, locationData.lng]} className="flex-1" />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-full bg-card rounded-lg shadow-md overflow-hidden relative group flex flex-col">
            <div className="drag-handle bg-muted/50 hover:bg-muted cursor-move py-1 text-center text-muted-foreground flex items-center justify-center z-10">
                <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-muted-foreground hover:text-foreground"
                onClick={() => onDelete(item.id)}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
});
BoardItemDisplay.displayName = 'BoardItemDisplay';

function CreativeProjectPageDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const pdfUploadRef = useRef<HTMLInputElement>(null);
  const itemCountRef = useRef(0);

  const [project, setProject] = useState<CreativeProject | null>(null);
  const [items, setItems] = useState<BoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name: string} | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!projectId || !user) return;
    try {
      const [projData, itemsData] = await Promise.all([
        firestoreApi.getCreativeProject(projectId),
        firestoreApi.getBoardItems(projectId),
      ]);

      if (projData) {
        setProject(projData);
        setItems(itemsData);
        itemCountRef.current = itemsData.length;
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
        router.push('/');
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro em /creative/[id]/page.tsx (fetchProjectData)',
        description: <CopyableError userMessage="Não foi possível carregar os dados do projeto." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user, toast, router]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);
  
  const handleProjectSubmit = async (data: Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>) => {
    if (!project) return;
    try {
      await firestoreApi.updateCreativeProject(project.id, data);
      await fetchProjectData();
      setIsEditDialogOpen(false);
      toast({ title: 'Projeto atualizado com sucesso!' });
    } catch (error) {
       const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro em /creative/[id]/page.tsx (handleProjectSubmit)',
            description: <CopyableError userMessage="Não foi possível atualizar o projeto." errorCode={errorTyped.code || errorTyped.message} />,
        });
    }
  };

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleItemUpdate = useCallback((itemId: string, data: Partial<BoardItem>) => {
      setItems(prevItems =>
          prevItems.map(item => (item.id === itemId ? { ...item, ...data } : item))
      );
  
      if (debounceTimers.current[itemId]) {
          clearTimeout(debounceTimers.current[itemId]);
      }
  
      debounceTimers.current[itemId] = setTimeout(() => {
          firestoreApi.updateBoardItem(itemId, data)
              .catch(error => {
                  const errorTyped = error as { code?: string; message: string };
                    toast({
                        variant: 'destructive',
                        title: 'Erro em /creative/[id]/page.tsx (handleItemUpdate)',
                        description: <CopyableError userMessage="Não foi possível salvar a alteração." errorCode={errorTyped.code || errorTyped.message} />,
                    });
                  fetchProjectData();
              });
      }, 500);
  }, [fetchProjectData, toast]);


  const handleAddItem = async (type: BoardItem['type'], content: string, size: { width: number | string; height: number | string }, items?: ChecklistItem[]) => {
    try {
      const offset = itemCountRef.current * 20;
      const newPosition = { x: 50 + offset, y: 50 + offset };
      
      const newItemData: any = {
        type,
        content,
        size,
        position: newPosition,
      };

      if (type === 'checklist' && items) {
        newItemData.items = items;
      }
      
      await firestoreApi.addBoardItem(projectId, newItemData);
      await fetchProjectData();

      const typeDisplayNames = {
          note: 'Nota',
          checklist: 'Checklist',
          palette: 'Paleta de cores',
          image: 'Imagem',
          pdf: 'PDF',
          video: 'Vídeo',
          location: 'Localização',
      };
      toast({ title: `${typeDisplayNames[type]} adicionada!` });

      if (type === 'video') {
        setIsVideoDialogOpen(false);
        setVideoUrl("");
      }
      if (type === 'location') {
        setIsLocationDialogOpen(false);
        setSelectedLocation(null);
      }

    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({ 
          variant: 'destructive', 
          title: `Erro em /creative/[id]/page.tsx (handleAddItem, tipo: ${type})`,
          description: <CopyableError userMessage="Não foi possível adicionar o item ao quadro." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };
  
  const handleAddNote = () => {
    handleAddItem('note', '<h2>Novo Título</h2><p>Comece a escrever aqui...</p>', { width: 350, height: 300 });
  }

  const handleAddChecklist = () => {
    handleAddItem('checklist', 'Nova Lista', { width: 300, height: 250 }, [{ id: crypto.randomUUID(), text: 'Primeiro item', checked: false }]);
  }

  const handleAddPalette = () => {
    handleAddItem('palette', JSON.stringify(['#f87171', '#60a5fa', '#34d399', '#a78bfa']), { width: 250, height: 80 });
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    setIsUploading(true);
    const file = event.target.files[0];

    try {
      const image = new window.Image();
      image.src = URL.createObjectURL(file);
      await new Promise(resolve => { image.onload = resolve; });

      const MAX_WIDTH = 400;
      const aspectRatio = image.naturalWidth / image.naturalHeight;
      const width = Math.min(image.naturalWidth, MAX_WIDTH);
      const height = width / aspectRatio;

      URL.revokeObjectURL(image.src);

      const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const url = await firestoreApi.uploadImageForBoard(compressedFile);
      await handleAddItem('image', url, { width, height });
    } catch (error) {
       const errorTyped = error as { code?: string; message: string };
       toast({ 
          variant: 'destructive', 
          title: 'Erro em /creative/[id]/page.tsx (handleImageUpload)',
          description: <CopyableError userMessage="Não foi possível fazer o upload da imagem." errorCode={errorTyped.code || errorTyped.message} />
       });
    } finally {
      setIsUploading(false);
      if (imageUploadRef.current) imageUploadRef.current.value = "";
    }
  };
  
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    setIsUploading(true);
    const file = event.target.files[0];

    try {
      const url = await firestoreApi.uploadPdfForBoard(file);
      await handleAddItem('pdf', url, { width: 400, height: 500 });
    } catch (error) {
       const errorTyped = error as { code?: string; message: string };
       toast({ 
          variant: 'destructive', 
          title: 'Erro em /creative/[id]/page.tsx (handlePdfUpload)',
          description: <CopyableError userMessage="Não foi possível fazer o upload do PDF." errorCode={errorTyped.code || errorTyped.message} />
       });
    } finally {
      setIsUploading(false);
      if (pdfUploadRef.current) pdfUploadRef.current.value = "";
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await firestoreApi.deleteBoardItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      toast({ title: 'Item removido.' });
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
       toast({ 
          variant: 'destructive', 
          title: 'Erro em /creative/[id]/page.tsx (handleDeleteItem)',
          description: <CopyableError userMessage="Não foi possível remover o item." errorCode={errorTyped.code || errorTyped.message} />
       });
    }
  };

  const handleAddVideo = () => {
    if (!videoUrl) return;
    const embedUrl = getYoutubeEmbedUrl(videoUrl) || getVimeoEmbedUrl(videoUrl);
    if (!embedUrl) {
        toast({ variant: 'destructive', title: 'URL Inválida', description: 'Por favor, insira uma URL válida do YouTube ou Vimeo.' });
        return;
    }
    handleAddItem('video', videoUrl, { width: 480, height: 270 });
  };

  const handleAddLocation = () => {
    if (!selectedLocation) return;
    handleAddItem('location', JSON.stringify(selectedLocation), { width: 300, height: 300 });
  };
  
  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40">
      <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
          <Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                <Brush className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-primary truncate">{project.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsEditDialogOpen(true)} variant="outline" size="sm">
            <Edit className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Editar Detalhes</span>
          </Button>
          <UserNav />
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <div className="bg-background border-b z-30">
            <div className="px-4 md:px-6 pt-4 md:pt-6">
              <Card>
                <CardContent className="p-4 md:p-6 space-y-1">
                  <CardTitle>{project.name}</CardTitle>
                  {project.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {project.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="p-2 md:p-4">
                <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                    <Button variant="ghost" size="sm" onClick={handleAddNote}>
                        <FileText className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Nota</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleAddChecklist}>
                        <ListTodo className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Checklist</span>
                    </Button>
                     <Button variant="ghost" size="sm" onClick={handleAddPalette}>
                        <Palette className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Paleta</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => imageUploadRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <ImageIcon className="h-4 w-4 md:mr-2" />}
                        <span className="hidden md:inline">Imagem</span>
                    </Button>
                    <input type="file" ref={imageUploadRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    <Button variant="ghost" size="sm" onClick={() => pdfUploadRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <FileIcon className="h-4 w-4 md:mr-2" />}
                        <span className="hidden md:inline">PDF</span>
                    </Button>
                    <input type="file" ref={pdfUploadRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                    <Button variant="ghost" size="sm" onClick={() => setIsVideoDialogOpen(true)}>
                        <Video className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Vídeo</span>
                    </Button>
                     <Button variant="ghost" size="sm" onClick={() => setIsLocationDialogOpen(true)}>
                        <MapPin className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Local</span>
                    </Button>
                </div>
            </div>
        </div>
        <div className="relative flex-1 w-full h-full bg-grid-slate-200/[0.5] dark:bg-grid-slate-700/[0.5]">
          {items.map(item => (
            <Rnd
              key={item.id}
              size={{ width: item.size.width, height: item.size.height }}
              position={{ x: item.position.x, y: item.position.y }}
              onDragStop={(_e, d) => handleItemUpdate(item.id, { position: { x: d.x, y: d.y }})}
              onResizeStop={(_e, _direction, ref, _delta, position) => {
                handleItemUpdate(item.id, {
                  size: { width: ref.style.width, height: ref.style.height },
                  position,
                });
              }}
              minWidth={150}
              minHeight={80}
              bounds="parent"
              className="z-20"
              dragHandleClassName="drag-handle"
            >
              <BoardItemDisplay item={item} onDelete={handleDeleteItem} onUpdate={handleItemUpdate} />
            </Rnd>
          ))}
        </div>
      </main>
      
      <AppFooter />
      
      <CreateEditCreativeProjectDialog isOpen={isEditDialogOpen} setIsOpen={setIsEditDialogOpen} onSubmit={handleProjectSubmit} project={project} />

      {/* Add Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Vídeo</DialogTitle><DialogDescription>Cole a URL de um vídeo do YouTube ou Vimeo.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4"><Label htmlFor="video-url">URL do Vídeo</Label><Input id="video-url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/></div>
            <DialogFooter><Button onClick={handleAddVideo}>Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Location Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Adicionar Localização</DialogTitle><DialogDescription>Pesquise ou clique no mapa para adicionar um local.</DialogDescription></DialogHeader>
            <div className="py-4">
                <LocationPicker
                    initialPosition={[-14.235, -51.925]}
                    onLocationChange={(lat, lng, name) => setSelectedLocation({ lat, lng, name })}
                />
            </div>
            <DialogFooter><Button onClick={handleAddLocation} disabled={!selectedLocation}>Adicionar Local</Button></DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function CreativeProjectPage() {
  return (
    <AuthGuard>
      <AdminGuard>
        <CreativeProjectPageDetail />
      </AdminGuard>
    </AuthGuard>
  );
}
