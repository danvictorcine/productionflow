
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import imageCompression from 'browser-image-compression';

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Post } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { getYoutubeEmbedUrl, getVimeoEmbedUrl } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Register the image resize module only on the client-side
if (typeof window !== 'undefined') {
    const Quill = require('quill');
    const ImageResize = require('quill-image-resize-module-react').default;
    Quill.register('modules/imageResize', ImageResize);
}

// Import Quill dynamically to ensure it runs only on the client-side
const QuillEditor = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full rounded-b-md" />
});

const postSchema = z.object({
    title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
    content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
});

const getUrlsFromHtml = (html: string): string[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(doc.querySelectorAll('img'));
  const urls = images.map(img => img.src);
  return urls.filter(url => url.includes('firebasestorage.googleapis.com'));
};

export default function EditPostPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const quillRef = useRef<any>(null);
    const initialImageUrlsRef = useRef<Set<string>>(new Set());

    const postId = params.id as string;
    const isNewPost = postId === 'new';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
    const [videoUrlInput, setVideoUrlInput] = useState("");

    const form = useForm<z.infer<typeof postSchema>>({
        resolver: zodResolver(postSchema),
        defaultValues: { title: '', content: '' },
    });
    
    useEffect(() => {
        if (isNewPost) {
            setIsLoading(false);
            return;
        }

        if (postId) {
            firestoreApi.getPost(postId)
                .then(post => {
                    if (post) {
                        form.reset({ title: post.title, content: post.content });
                        initialImageUrlsRef.current = new Set(getUrlsFromHtml(post.content));
                    } else {
                        toast({ variant: 'destructive', title: 'Erro ao Carregar', description: <CopyableError userMessage='Post não encontrado.' errorCode='POST_NOT_FOUND'/> });
                        router.push('/admin/blog');
                    }
                })
                .catch((error) => {
                    const errorTyped = error as { code?: string; message: string };
                    toast({ 
                        variant: 'destructive',
                        title: 'Erro ao Carregar Post',
                        description: <CopyableError userMessage="Não foi possível carregar os dados do post." errorCode={errorTyped.code || 'UNKNOWN_FETCH_ERROR'} />,
                    });
                    router.push('/admin/blog');
                })
                .finally(() => setIsLoading(false));
        }
    }, [postId, isNewPost, router, toast, form]);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: function() { // Use function keyword to get correct `this` binding
                    const editor = quillRef.current?.getEditor();
                    if (!editor) {
                        toast({ variant: 'destructive', title: 'Erro de Editor', description: <CopyableError userMessage='O editor de texto não está pronto. Tente novamente.' errorCode='EDITOR_NOT_READY' /> });
                        return;
                    }
                    const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    document.body.appendChild(input);

                    input.onchange = async () => {
                        try {
                            if (!input.files || input.files.length === 0) return;
                            const file = input.files[0];
                            const insertIndex = range ? range.index : 0;
                            if (!/^image\//.test(file.type)) {
                                toast({ variant: 'destructive', title: 'Arquivo Inválido', description: <CopyableError userMessage='Por favor, selecione um arquivo de imagem.' errorCode='INVALID_FILE_TYPE'/> });
                                return;
                            }
                            editor.insertEmbed(insertIndex, 'image', 'https://placehold.co/300x200.png?text=Enviando...');
                            editor.setSelection(insertIndex + 1);
                            try {
                                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                                const compressedBlob = await imageCompression(file, options);
                                const compressedFile = new File([compressedBlob], file.name, { type: file.type, lastModified: Date.now() });
                                const url = await firestoreApi.uploadImageForPageContent(compressedFile);
                                editor.deleteText(insertIndex, 1);
                                editor.insertEmbed(insertIndex, 'image', url);
                                editor.setSelection(insertIndex + 1);
                            } catch (uploadError) {
                                editor.deleteText(insertIndex, 1);
                                const errorTyped = uploadError as { code?: string; message: string };
                                toast({
                                    variant: 'destructive',
                                    title: 'Erro de Upload',
                                    description: <CopyableError userMessage="Não foi possível enviar a imagem." errorCode={errorTyped.code || 'UPLOAD_FAILED'} />,
                                });
                            }
                        } finally {
                            if (input.parentNode) {
                                input.parentNode.removeChild(input);
                            }
                        }
                    };
                    input.click();
                },
                video: function() {
                     const editor = quillRef.current?.getEditor();
                     if (!editor) {
                        toast({ variant: 'destructive', title: 'Erro de Editor', description: <CopyableError userMessage='O editor de texto não está pronto.' errorCode='EDITOR_NOT_READY' /> });
                        return;
                    }
                     setVideoUrlInput('');
                     setIsVideoDialogOpen(true);
                }
            }
        },
        imageResize: {
            parchment: require('quill').Quill.import('parchment'),
            modules: ['Resize', 'DisplaySize', 'Toolbar']
        }
    }), []);

    const handleEmbedVideo = () => {
        const editor = quillRef.current?.getEditor();
        if (!editor) {
            toast({ variant: 'destructive', title: 'Erro de Editor', description: <CopyableError userMessage="Ocorreu um erro ao incorporar o vídeo." errorCode="EDITOR_NOT_READY" /> });
            return;
        }
        if (!videoUrlInput) {
            toast({ variant: 'destructive', title: 'URL Ausente', description: <CopyableError userMessage="É necessário inserir uma URL." errorCode="MISSING_VIDEO_URL" /> });
            return;
        }

        const embedUrl = getYoutubeEmbedUrl(videoUrlInput) || getVimeoEmbedUrl(videoUrlInput);

        if (!embedUrl) {
            toast({ variant: 'destructive', title: 'URL Inválida', description: <CopyableError userMessage='Por favor, insira uma URL válida do YouTube ou Vimeo.' errorCode='INVALID_VIDEO_URL'/> });
            return;
        }

        const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
        editor.insertEmbed(range.index, 'video', embedUrl);
        editor.formatLine(range.index, 1, 'align', 'center');
        
        setIsVideoDialogOpen(false);
        setVideoUrlInput('');
    };

    async function onSubmit(values: z.infer<typeof postSchema>) {
        if (!user) return;
        setIsSaving(true);
        try {
            const postData = {
                ...values,
                authorId: user.uid,
                authorName: user.name,
                authorPhotoURL: user.photoURL || '',
            };

            const finalImageUrls = new Set(getUrlsFromHtml(values.content));
            const imageUrlsToDelete = [...initialImageUrlsRef.current].filter(
              url => !finalImageUrls.has(url)
            );

            if (isNewPost) {
                await firestoreApi.addPost(postData);
                toast({ title: 'Publicação criada com sucesso!' });
            } else {
                await firestoreApi.updatePost(postId, postData);
                toast({ title: 'Publicação atualizada com sucesso!' });
            }

            if (imageUrlsToDelete.length > 0) {
              await Promise.all(
                imageUrlsToDelete.map(url => firestoreApi.deleteImageFromUrl(url))
              );
            }

            router.push('/admin/blog');
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar a publicação." errorCode={errorTyped.code || 'SAVE_FAILED'} />,
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
             <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-10 w-24" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/admin/blog" className="flex items-center gap-2" aria-label="Voltar para o blog">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">{isNewPost ? 'Nova Publicação' : 'Editar Publicação'}</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-2xl">Título</FormLabel>
                                <FormControl>
                                    <Input placeholder="Título da sua publicação" {...field} className="text-2xl h-14" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Conteúdo</FormLabel>
                                <FormControl>
                                    <QuillEditor
                                        ref={quillRef}
                                        value={field.value}
                                        onChange={field.onChange}
                                        modules={modules}
                                        theme="snow"
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isNewPost ? 'Publicar' : 'Salvar Alterações'}
                        </Button>
                    </form>
                </Form>
            </main>
            <AppFooter />

            <AlertDialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Incorporar Vídeo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cole a URL de um vídeo do YouTube ou Vimeo para adicioná-lo à sua publicação.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input 
                        value={videoUrlInput} 
                        onChange={(e) => setVideoUrlInput(e.target.value)} 
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEmbedVideo}>Incorporar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
