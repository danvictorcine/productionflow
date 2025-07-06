
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brush, Edit, Trash2, StickyNote, Image as ImageIcon, Video, MapPin, Loader2 } from 'lucide-react';
import { Rnd } from 'react-rnd';
import imageCompression from 'browser-image-compression';
import dynamic from 'next/dynamic';

import type { CreativeProject, BoardItem } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { CreateEditCreativeProjectDialog } from '@/components/create-edit-creative-project-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const DisplayMap = dynamic(() => import('@/components/display-map').then(mod => mod.DisplayMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const LocationPicker = dynamic(() => import('@/components/location-picker').then(mod => mod.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
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
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            onUpdate(item.id, { content: newContent });
        }, 500);
    };

    const renderContent = () => {
        switch (item.type) {
            case 'note':
                return (
                    <Textarea
                        ref={textAreaRef}
                        defaultValue={item.content}
                        onChange={handleNoteChange}
                        className="w-full h-full resize-none border-none focus:ring-0 bg-yellow-100 text-yellow-900 p-2"
                        placeholder="Escreva sua nota..."
                    />
                );
            case 'image':
                return <img src={item.content} alt="Moodboard item" className="w-full h-full object-cover" data-ai-hint="abstract texture"/>;
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
        <div className="w-full h-full bg-card rounded-lg shadow-md overflow-hidden relative group">
            {renderContent()}
            <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(item.id)}
            >
                <Trash2 className="h-3 w-3" />
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
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
        router.push('/');
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar projeto',
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
      toast({ variant: 'destructive', title: 'Erro ao atualizar projeto.' });
    }
  };

  const handleItemUpdate = useCallback(async (itemId: string, data: Partial<BoardItem>) => {
    try {
        await firestoreApi.updateBoardItem(itemId, data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao salvar alteração.' });
        fetchProjectData();
    }
  }, [fetchProjectData, toast]);


  const handleAddItem = async (type: BoardItem['type'], content: string, size: { width: number | string, height: number | string }): Promise<boolean> => {
    try {
        const newItemData = { type, content, size, position: { x: 50, y: 50 }, };
        await firestoreApi.addBoardItem(projectId, newItemData);
        await fetchProjectData();
        return true;
    } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({ 
            variant: 'destructive', 
            title: `Erro ao adicionar ${type}`,
            description: <CopyableError userMessage="Não foi possível adicionar o item ao quadro." errorCode={errorTyped.code || errorTyped.message} />,
        });
        return false;
    }
  };
  
  const handleAddNote = async () => {
    if (await handleAddItem('note', '', { width: 250, height: 200 })) {
      toast({ title: "Nota adicionada!" });
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    setIsUploading(true);
    try {
      const file = event.target.files[0];
      const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const url = await firestoreApi.uploadImageForBoard(compressedFile);
      if (await handleAddItem('image', url, { width: 400, height: 300 })) {
        toast({ title: 'Imagem adicionada!' });
      }
    } catch (error) {
       const errorTyped = error as { code?: string; message: string };
       toast({ 
          variant: 'destructive', 
          title: 'Erro no upload da imagem.',
          description: <CopyableError userMessage="Não foi possível fazer o upload da imagem." errorCode={errorTyped.code || errorTyped.message} />
       });
    } finally {
      setIsUploading(false);
      if (imageUploadRef.current) imageUploadRef.current.value = "";
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await firestoreApi.deleteBoardItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      toast({ title: 'Item removido.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover item.' });
    }
  };

  const handleAddVideo = async () => {
    if (!videoUrl) return;
    const embedUrl = getYoutubeEmbedUrl(videoUrl) || getVimeoEmbedUrl(videoUrl);
    if (!embedUrl) {
        toast({ variant: 'destructive', title: 'URL Inválida', description: 'Por favor, insira uma URL válida do YouTube ou Vimeo.' });
        return;
    }
    if (await handleAddItem('video', videoUrl, { width: 480, height: 270 })) {
        toast({ title: 'Vídeo adicionado!' });
        setIsVideoDialogOpen(false);
        setVideoUrl("");
    }
  };

  const handleAddLocation = async () => {
    if (!selectedLocation) return;
    if (await handleAddItem('location', JSON.stringify(selectedLocation), { width: 300, height: 300 })) {
        toast({ title: 'Localização adicionada!' });
        setIsLocationDialogOpen(false);
        setSelectedLocation(null);
    }
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
      <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
          <Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex items-center gap-3"><Brush className="h-6 w-6 text-muted-foreground" /><h1 className="text-xl font-bold text-primary truncate">{project.name}</h1></div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsEditDialogOpen(true)} variant="outline"><Edit className="mr-2 h-4 w-4" />Editar Projeto</Button>
          <UserNav />
        </div>
      </header>
      
      <main className="flex-1 flex flex-col">
        <div className="flex-shrink-0 bg-background p-2 border-b z-30">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleAddNote}>
                    <StickyNote className="mr-2 h-4 w-4" />Adicionar Nota
                </Button>
                <Button variant="ghost" size="sm" onClick={() => imageUploadRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                    Adicionar Imagem
                </Button>
                <input type="file" ref={imageUploadRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <Button variant="ghost" size="sm" onClick={() => setIsVideoDialogOpen(true)}>
                    <Video className="mr-2 h-4 w-4" />Adicionar Vídeo
                </Button>
                 <Button variant="ghost" size="sm" onClick={() => setIsLocationDialogOpen(true)}>
                    <MapPin className="mr-2 h-4 w-4" />Adicionar Local
                </Button>
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
              minHeight={50}
              bounds="parent"
              className="z-20"
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
      <CreativeProjectPageDetail />
    </AuthGuard>
  );
}
