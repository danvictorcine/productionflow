// @/src/components/creative-project-page-detail.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brush, Edit, Trash2, Image as ImageIcon, Video, MapPin, Loader2, GripVertical, FileText, ListTodo, Palette, Plus, File as FileIcon, X, ExternalLink, Music, Type, GalleryVertical, ZoomIn, ZoomOut } from 'lucide-react';
import { Rnd } from 'react-rnd';
import imageCompression from 'browser-image-compression';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';


import type { CreativeProject, BoardItem, ChecklistItem, LocationAddress } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { CreateEditCreativeProjectDialog } from '@/components/create-edit-creative-project-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { DEFAULT_BETA_LIMITS } from '@/lib/app-config';


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

const getSpotifyEmbedUrl = (url: string) => {
    const spotifyRegex = /https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/;
    const match = url.match(spotifyRegex);
    if (match && match[1] && match[2]) {
        const type = match[1];
        const id = match[2];
        return `https://open.spotify.com/embed/${type}/${id}`;
    }
    return null;
}

const formatLocation = (location?: LocationAddress): string => {
    if (!location) return "Localização não definida";
    
    const parts = [
        location.road,
        location.house_number,
        location.city,
        location.state,
        location.country
    ];
    
    const validParts = parts.filter(p => typeof p === 'string' && p.trim() !== '');

    if (validParts.length === 0) {
        return location.displayName || "Localização não definida";
    }

    return validParts.join(', ');
}


const BoardItemDisplay = React.memo(({ item, onDelete, onUpdate, isSelected, onSelect }: { 
    item: BoardItem; 
    onDelete: (id: string) => void; 
    onUpdate: (id: string, data: Partial<BoardItem>) => void;
    isSelected: boolean;
    onSelect: (itemId: string | null) => void;
}) => {
    const colorInputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout>();
    const quillRef = useRef<any>(null);


    const handleChecklistUpdate = (updatedItems: ChecklistItem[]) => {
        onUpdate(item.id, { items: updatedItems });
    };

    const handlePaletteUpdate = (updatedColors: string[]) => {
        onUpdate(item.id, { content: JSON.stringify(updatedColors) });
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNotes = e.target.value;
        onUpdate(item.id, { notes: newNotes }); // Optimistic UI update

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            firestoreApi.updateBoardItem(item.projectId, item.id, { notes: newNotes });
        }, 500);
    };

    const quillModules = useMemo(() => ({
      toolbar: {
        container: `#toolbar-${item.id}`,
      }
    }), [item.id]);
    
    const renderContent = () => {
        switch (item.type) {
            case 'note':
                return (
                    <div 
                        className="h-full w-full flex flex-col note-editor-container"
                        data-selected={isSelected}
                        onClick={() => onSelect(item.id)}
                    >
                        <div id={`toolbar-${item.id}`} className="ql-toolbar ql-snow">
                            <span className="ql-formats">
                                <select className="ql-header" defaultValue="">
                                    <option value="1">Título 1</option>
                                    <option value="2">Título 2</option>
                                    <option value="">Normal</option>
                                </select>
                            </span>
                            <span className="ql-formats">
                                <button className="ql-bold"></button>
                                <button className="ql-italic"></button>
                                <button className="ql-underline"></button>
                            </span>
                            <span className="ql-formats">
                                <button className="ql-list" value="ordered"></button>
                                <button className="ql-list" value="bullet"></button>
                            </span>
                             <span className="ql-formats">
                                <button className="ql-link"></button>
                            </span>
                             <span className="ql-formats">
                                <button className="ql-clean"></button>
                            </span>
                        </div>
                         <QuillEditor
                            ref={quillRef}
                            theme="snow"
                            value={item.content}
                            onChange={(content) => onUpdate(item.id, { content })}
                            modules={quillModules}
                            className="h-full w-full flex-grow"
                        />
                    </div>
                );
            case 'storyboard':
                return (
                    <div className="flex flex-col h-full bg-card" onClick={() => onSelect(null)}>
                        <div className="relative w-full aspect-video bg-muted flex-shrink-0">
                           <img src={item.content} alt="Storyboard panel" className="w-full h-full object-cover" data-ai-hint="action sequence" />
                        </div>
                        <Textarea 
                            placeholder="Adicione suas anotações aqui..."
                            defaultValue={item.notes}
                            onChange={handleNotesChange}
                            className="text-sm bg-transparent border-none focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring p-2 flex-grow resize-none"
                        />
                    </div>
                );
            case 'checklist': {
                const title = item.content;
                const items = item.items || [];
                return (
                    <div className="p-3 flex flex-col h-full bg-background" onClick={() => onSelect(null)}>
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
                    <div className="p-2 flex flex-col h-full bg-background" onClick={() => onSelect(null)}>
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
                return <img src={item.content} alt="Moodboard item" className="w-full h-full object-cover" data-ai-hint="abstract texture" onClick={() => onSelect(null)}/>;
            case 'pdf':
                return (
                    <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(item.content)}&embedded=true`}
                        className="w-full h-full"
                        style={{ border: 'none' }}
                        title="PDF Viewer"
                        onClick={() => onSelect(null)}
                    ></iframe>
                );
            case 'video':
                 const youtubeUrl = getYoutubeEmbedUrl(item.content);
                 const vimeoUrl = getVimeoEmbedUrl(item.content);
                 const embedUrl = youtubeUrl || vimeoUrl;
                 if (embedUrl) {
                     return <iframe src={embedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen onClick={() => onSelect(null)}></iframe>;
                 }
                 return <div className="p-2 text-red-500 text-xs" onClick={() => onSelect(null)}>Link de vídeo inválido ou não suportado. Use links do YouTube ou Vimeo.</div>;
            case 'spotify':
                 const spotifyEmbedUrl = getSpotifyEmbedUrl(item.content);
                 if (spotifyEmbedUrl) {
                     return <iframe src={spotifyEmbedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onClick={() => onSelect(null)}></iframe>;
                 }
                 return <div className="p-2 text-red-500 text-xs" onClick={() => onSelect(null)}>Link do Spotify inválido. Use um link de música, álbum ou playlist.</div>;
            case 'location': {
                let locationData: LocationAddress | null = null;
                try {
                    if (item.content) {
                        locationData = JSON.parse(item.content);
                    }
                } catch (e) {
                    console.error("Failed to parse location data", e);
                }
                const formattedLocation = locationData ? formatLocation(locationData) : "Localização inválida";

                return (
                    <div className="w-full h-full flex flex-col" onClick={() => onSelect(null)}>
                        <DisplayMap position={locationData ? [locationData.lat, locationData.lng] : [0,0]} className="flex-1" />
                        <div className="bg-muted text-muted-foreground text-xs p-1 truncate order-last">{formattedLocation}</div>
                    </div>
                );
            }
            default:
                return null;
        }
    };

    return (
        <div 
            className={cn(
                "w-full h-full bg-card rounded-lg shadow-md overflow-hidden relative group flex flex-col transition-all duration-200"
            )}
        >
            <div className="drag-handle absolute top-0 left-1/2 -translate-x-1/2 w-12 h-5 flex items-start justify-center cursor-move z-10 opacity-30 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-0.5 right-0.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => onDelete(item.id)}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
});
BoardItemDisplay.displayName = 'BoardItemDisplay';

interface CreativeProjectPageDetailProps {
    project: CreativeProject;
    initialItems: BoardItem[];
    onDataRefresh: () => void;
}

export default function CreativeProjectPageDetail({ project, initialItems, onDataRefresh }: CreativeProjectPageDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const pdfUploadRef = useRef<HTMLInputElement>(null);
  const storyboardUploadRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const dirtyItemsRef = useRef(new Set<string>());

  const [items, setItems] = useState<BoardItem[]>(initialItems);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Dialog states
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isSpotifyDialogOpen, setIsSpotifyDialogOpen] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationAddress & {lat: number, lng: number} | null>(null);
  
  // Zoom and Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const startPanPoint = useRef({ x: 0, y: 0 });
  const pinchStartDistance = useRef(0);
  
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const setInitialView = useCallback((containerWidth: number, containerHeight: number) => {
    if (items.length === 0) {
        setPosition({ x: containerWidth / 2, y: containerHeight / 3 });
        setScale(1);
        return;
    };

    const padding = 50;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
        const width = typeof item.size.width === 'string' ? parseFloat(item.size.width) : item.size.width;
        const height = typeof item.size.height === 'string' ? parseFloat(item.size.height) : item.size.height;
        minX = Math.min(minX, item.position.x);
        minY = Math.min(minY, item.position.y);
        maxX = Math.max(maxX, item.position.x + width);
        maxY = Math.max(maxY, item.position.y + height);
    });
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    if (contentWidth <= 0 || contentHeight <= 0) return;
    const scaleX = (containerWidth - padding * 2) / contentWidth;
    const scaleY = (containerHeight - padding * 2) / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);
    const newX = (containerWidth - contentWidth * newScale) / 2 - minX * newScale;
    const newY = (containerHeight - contentHeight * newScale) / 2 - minY * newScale;
    setScale(newScale);
    setPosition({ x: newX, y: newY });
  }, [items]);

  useEffect(() => {
    if (!mainContainerRef.current) return;
    const container = mainContainerRef.current;
    setInitialView(container.clientWidth, container.clientHeight);
  }, [items, setInitialView]);
  

  const saveDirtyItems = useCallback(async () => {
    if (dirtyItemsRef.current.size === 0) return;
    const itemsToUpdate = Array.from(dirtyItemsRef.current).map(id => {
        const item = items.find(i => i.id === id);
        if (!item) return null;
        return {
            id: item.id,
            data: { position: item.position, size: item.size }
        };
    }).filter(Boolean) as { id: string, data: Partial<BoardItem> }[];
    if (itemsToUpdate.length > 0) {
        try {
            await firestoreApi.updateBoardItemsBatch(project.id, itemsToUpdate);
            dirtyItemsRef.current.clear();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro de Sincronização' });
        }
    }
  }, [items, toast, project.id]);
  
  // Debounced save effect for position and size
  useEffect(() => {
    if (dirtyItemsRef.current.size === 0) return;
    const debounceTimer = setTimeout(() => { saveDirtyItems(); }, 2000);
    return () => clearTimeout(debounceTimer);
  }, [items, saveDirtyItems]);

  // Save on unmount
  useEffect(() => {
    return () => { saveDirtyItems(); };
  }, [saveDirtyItems]);
  
  const handleItemUpdate = useCallback((itemId: string, data: Partial<BoardItem>) => {
    setItems(prevItems => {
        const newItems = prevItems.map(item => (item.id === itemId ? { ...item, ...data } : item));
        if(data.position || data.size) { dirtyItemsRef.current.add(itemId); }
        return newItems;
    });
    if (data.content || data.items) {
        const contentUpdate: Partial<BoardItem> = {};
        if(data.content) contentUpdate.content = data.content;
        if(data.items) contentUpdate.items = data.items;
        const debounceContentTimer = setTimeout(() => {
             firestoreApi.updateBoardItem(project.id, itemId, contentUpdate)
                .catch(err => console.error("Failed to save content", err));
        }, 500);
        return () => clearTimeout(debounceContentTimer);
    }
  }, [project.id]);

  const handleAddItem = async (type: BoardItem['type'], content: string, size: { width: number | string; height: number | string }, extraData?: Partial<Omit<BoardItem, 'type' | 'content' | 'size'>>) => {
    if (!user?.isAdmin && items.length >= DEFAULT_BETA_LIMITS.MAX_ITEMS_PER_MOODBOARD) {
        toast({
            variant: "destructive",
            title: "Limite de itens atingido!",
            description: `A versão Beta permite até ${DEFAULT_BETA_LIMITS.MAX_ITEMS_PER_MOODBOARD} itens por moodboard.`,
        });
        return;
    }
    
    try {
      const offset = items.length * 20;
      const newPosition = { x: 50 + offset, y: 50 + offset };
      
      const newItemData: any = { type, content, size, position: newPosition, ...extraData };
      const newItemId = await firestoreApi.addBoardItem(project.id, newItemData);
      onDataRefresh();
      
      if (type === 'note') { setSelectedItemId(newItemId); }

      toast({ title: `Item adicionado!` });
      if (type === 'video') { setIsVideoDialogOpen(false); setVideoUrl(""); }
      if (type === 'spotify') { setIsSpotifyDialogOpen(false); setSpotifyUrl(""); }
      if (type === 'location') { setIsLocationDialogOpen(false); setSelectedLocation(null); }

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar item' });
    }
  };
  
  const handleAddNote = () => handleAddItem('note', '<h2>Novo Título</h2><p>Comece a escrever aqui...</p>', { width: 350, height: 300 });
  const handleAddChecklist = () => handleAddItem('checklist', 'Nova Lista', { width: 300, height: 250 }, { items: [{ id: crypto.randomUUID(), text: 'Primeiro item', checked: false }] });
  const handleAddPalette = () => handleAddItem('palette', JSON.stringify(['#f87171', '#60a5fa', '#34d399', '#a78bfa']), { width: 250, height: 80 });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'storyboard') => {
    if (!user?.isAdmin && items.length >= DEFAULT_BETA_LIMITS.MAX_ITEMS_PER_MOODBOARD) {
        toast({ variant: "destructive", title: "Limite de itens atingido!" });
        if (imageUploadRef.current) imageUploadRef.current.value = "";
        return;
    }
    if (!event.target.files?.[0]) return;
    const file = event.target.files[0];
    setIsUploading(true);
    try {
      const image = new window.Image();
      image.src = URL.createObjectURL(file);
      await new Promise(resolve => { image.onload = resolve; });
      const aspectRatio = image.naturalWidth / image.naturalHeight;
      URL.revokeObjectURL(image.src);
      const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const url = await firestoreApi.uploadImageForBoard(compressedFile);
      if (type === 'storyboard') {
         const width = 400; const height = width / aspectRatio + 60;
         await handleAddItem('storyboard', url, { width, height }, { notes: '' });
      } else {
         const width = Math.min(image.naturalWidth, 400); const height = width / aspectRatio;
         await handleAddItem('image', url, { width, height });
      }
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro de Upload' });
    } finally {
      setIsUploading(false);
      if (imageUploadRef.current) imageUploadRef.current.value = "";
      if (storyboardUploadRef.current) storyboardUploadRef.current.value = "";
    }
  };
  
  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user?.isAdmin && items.length >= DEFAULT_BETA_LIMITS.MAX_ITEMS_PER_MOODBOARD) {
        toast({ variant: "destructive", title: "Limite de itens atingido!" });
        if (pdfUploadRef.current) pdfUploadRef.current.value = "";
        return;
    }
    if (!event.target.files?.[0]) return;
    const file = event.target.files[0];
    setIsUploading(true);
    try {
      const url = await firestoreApi.uploadPdfForBoard(file);
      await handleAddItem('pdf', url, { width: 400, height: 500 });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro de Upload' });
    } finally {
      setIsUploading(false);
      if (pdfUploadRef.current) pdfUploadRef.current.value = "";
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await firestoreApi.deleteBoardItem(project.id, itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      if (selectedItemId === itemId) { setSelectedItemId(null); }
      toast({ title: 'Item removido.' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro ao remover' });
    }
  };

  const handleAddVideo = () => {
    if (!videoUrl) return;
    const embedUrl = getYoutubeEmbedUrl(videoUrl) || getVimeoEmbedUrl(videoUrl);
    if (!embedUrl) { toast({ variant: 'destructive', title: 'URL Inválida' }); return; }
    handleAddItem('video', videoUrl, { width: 480, height: 270 });
  };
  
  const handleAddSpotify = () => {
    if (!spotifyUrl) return;
    const embedUrl = getSpotifyEmbedUrl(spotifyUrl);
    if (!embedUrl) { toast({ variant: 'destructive', title: 'URL Inválida' }); return; }
    handleAddItem('spotify', spotifyUrl, { width: 350, height: 380 });
  };

  const handleAddLocation = () => {
    if (!selectedLocation) return;
    handleAddItem('location', JSON.stringify(selectedLocation), { width: 300, height: 300 });
  };
  
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); const newScale = Math.min(Math.max(0.1, scale - (e.deltaY > 0 ? 0.1 : -0.1)), 2); setScale(newScale); };
  const handleZoom = (dir: 'in' | 'out') => { const newScale = Math.min(Math.max(0.1, scale + (dir === 'in' ? 0.15 : -0.15)), 2); setScale(newScale); }
  const handleMouseDown = (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest('.rnd-item, .tool-button')) return; e.preventDefault(); setSelectedItemId(null); isPanning.current = true; startPanPoint.current = { x: e.clientX - position.x, y: e.clientY - position.y }; (e.target as HTMLElement).classList.add('cursor-grabbing'); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isPanning.current) return; e.preventDefault(); setPosition({ x: e.clientX - startPanPoint.current.x, y: e.clientY - startPanPoint.current.y }); };
  const handleMouseUp = (e: React.MouseEvent) => { isPanning.current = false; (e.target as HTMLElement).classList.remove('cursor-grabbing'); };
  const handleTouchStart = (e: React.TouchEvent) => { if ((e.target as HTMLElement).closest('.rnd-item, .tool-button')) return; if (e.touches.length === 2) { e.preventDefault(); pinchStartDistance.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); isPanning.current = false; } else if (e.touches.length === 1) { e.preventDefault(); setSelectedItemId(null); isPanning.current = true; startPanPoint.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y }; } };
  const handleTouchMove = (e: React.TouchEvent) => { if (e.touches.length === 2) { e.preventDefault(); const currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); setScale(prev => Math.min(Math.max(0.1, prev * (currentDistance / pinchStartDistance.current)), 2)); pinchStartDistance.current = currentDistance; } else if (isPanning.current && e.touches.length === 1) { e.preventDefault(); setPosition({ x: e.touches[0].clientX - startPanPoint.current.x, y: e.touches[0].clientY - startPanPoint.current.y }); } };
  const handleTouchEnd = () => { isPanning.current = false; };
  
  return (
    <div className="flex flex-col h-full w-full bg-muted/40 overflow-hidden">
      <div className="bg-background border-b z-30">
        <div className="px-4 md:px-6 pt-4 md:pt-6">
          <Card>
            <CardContent className="p-4 md:p-6 space-y-1">
              <CardTitle>{project.name}</CardTitle>
              {project.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="p-2 md:p-4">
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={handleAddNote} className="tool-button"><Type className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Texto</span></Button>
                <Button variant="ghost" size="sm" onClick={handleAddChecklist} className="tool-button"><ListTodo className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Checklist</span></Button>
                <Button variant="ghost" size="sm" onClick={handleAddPalette} className="tool-button"><Palette className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Paleta</span></Button>
                <Button variant="ghost" size="sm" onClick={() => imageUploadRef.current?.click()} disabled={isUploading} className="tool-button">{isUploading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <ImageIcon className="h-4 w-4 md:mr-2" />}<span className="hidden md:inline">Imagem</span></Button>
                <input type="file" ref={imageUploadRef} onChange={(e) => handleImageUpload(e, 'image')} accept="image/*" className="hidden" />
                <Button variant="ghost" size="sm" onClick={() => storyboardUploadRef.current?.click()} disabled={isUploading} className="tool-button">{isUploading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <GalleryVertical className="h-4 w-4 md:mr-2" />}<span className="hidden md:inline">Storyboard</span></Button>
                <input type="file" ref={storyboardUploadRef} onChange={(e) => handleImageUpload(e, 'storyboard')} accept="image/*" className="hidden" />
                <Button variant="ghost" size="sm" onClick={() => pdfUploadRef.current?.click()} disabled={isUploading} className="tool-button">{isUploading ? <Loader2 className="h-4 w-4 animate-spin md:mr-2" /> : <FileIcon className="h-4 w-4 md:mr-2" />}<span className="hidden md:inline">PDF</span></Button>
                <input type="file" ref={pdfUploadRef} onChange={handlePdfUpload} accept="application/pdf" className="hidden" />
                <Button variant="ghost" size="sm" onClick={() => setIsVideoDialogOpen(true)} className="tool-button"><Video className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Vídeo</span></Button>
                <Button variant="ghost" size="sm" onClick={() => setIsSpotifyDialogOpen(true)} className="tool-button"><Music className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Música</span></Button>
                <Button variant="ghost" size="sm" onClick={() => setIsLocationDialogOpen(true)} className="tool-button"><MapPin className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Local</span></Button>
                <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="icon" onClick={() => handleZoom('out')} className="h-8 w-8 tool-button"><ZoomOut className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleZoom('in')} className="h-8 w-8 tool-button"><ZoomIn className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
      </div>
      <div ref={mainContainerRef} className={cn("flex-1 relative overflow-hidden cursor-grab")} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <div ref={canvasRef} className="absolute inset-0 bg-grid-slate-200/[0.5] dark:bg-grid-slate-700/[0.5] transition-transform duration-75" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`}} onClick={() => setSelectedItemId(null)}>
            <div className="relative min-w-full min-h-full">
              {items.map(item => (
                  <Rnd key={item.id} size={{ width: item.size.width, height: item.size.height }} position={{ x: item.position.x, y: item.position.y }} onDragStop={(_e, d) => handleItemUpdate(item.id, { position: { x: d.x, y: d.y }})} onResizeStop={(_e, _direction, ref, _delta, position) => { handleItemUpdate(item.id, { size: { width: ref.style.width, height: ref.style.height }, position }); }} onClick={(e) => e.stopPropagation()} minWidth={150} minHeight={80} className="z-20 rnd-item" dragHandleClassName="drag-handle">
                  <BoardItemDisplay item={item} onDelete={handleDeleteItem} onUpdate={handleItemUpdate} isSelected={selectedItemId === item.id} onSelect={setSelectedItemId} />
                  </Rnd>
              ))}
            </div>
          </div>
      </div>
      
      <Sheet open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}><SheetContent><SheetHeader><SheetTitle>Adicionar Vídeo</SheetTitle><SheetDescription>Cole a URL de um vídeo do YouTube ou Vimeo.</SheetDescription></SheetHeader><div className="grid gap-4 py-4"><Label htmlFor="video-url">URL do Vídeo</Label><Input id="video-url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/></div><SheetFooter><Button onClick={handleAddVideo}>Adicionar</Button></SheetFooter></SheetContent></Sheet>
      <Sheet open={isSpotifyDialogOpen} onOpenChange={setIsSpotifyDialogOpen}><SheetContent><SheetHeader><SheetTitle>Adicionar Música</SheetTitle><SheetDescription>Cole a URL de uma música, álbum ou playlist do Spotify.</SheetDescription></SheetHeader><div className="grid gap-4 py-4"><Label htmlFor="spotify-url">URL do Spotify</Label><Input id="spotify-url" value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} placeholder="https://open.spotify.com/track/..."/></div><SheetFooter><Button onClick={handleAddSpotify}>Adicionar</Button></SheetFooter></SheetContent></Sheet>
      <Sheet open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}><SheetContent className="sm:max-w-2xl"><SheetHeader><SheetTitle>Adicionar Localização</SheetTitle><SheetDescription>Pesquise ou clique no mapa para adicionar um local.</SheetDescription></SheetHeader><div className="py-4"><LocationPicker initialPosition={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : [-14.235, -51.925]} onLocationChange={(lat, lng, name) => setSelectedLocation({ lat, lng, ...name })} /></div><SheetFooter><Button onClick={handleAddLocation} disabled={!selectedLocation}>Adicionar Local</Button></SheetFooter></SheetContent></Sheet>

    </div>
  );
}
