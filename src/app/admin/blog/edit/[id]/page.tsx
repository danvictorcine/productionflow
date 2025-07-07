'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';
import { default as ImageResize } from 'quill-image-resize-module-react';
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

if (typeof window !== 'undefined') {
  Quill.register('modules/imageResize', ImageResize);
}

const postSchema = z.object({
    title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
    content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
});

const QuillEditor = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full rounded-b-md" />
});

const getImageUrlsFromDelta = (delta: any): string[] => {
  return delta.ops.reduce((urls: string[], op: any) => {
    if (op.insert && op.insert.image && op.insert.image.startsWith('https://firebasestorage.googleapis.com')) {
      urls.push(op.insert.image);
    }
    return urls;
  }, []);
};

export default function EditPostPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const quillRef = useRef<any>(null);
    const imageSetRef = useRef<Set<string>>(new Set());

    const postId = params.id as string;
    const isNewPost = postId === 'new';

    const [isLoading, setIsLoading] = useState(!isNewPost);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof postSchema>>({
        resolver: zodResolver(postSchema),
        defaultValues: { title: '', content: '' },
    });

    useEffect(() => {
        if (!isNewPost && postId) {
            firestoreApi.getPost(postId)
                .then(post => {
                    if (post) {
                        form.reset({ title: post.title, content: post.content });
                    } else {
                        toast({ variant: 'destructive', title: 'Post não encontrado.' });
                        router.push('/admin/blog');
                    }
                })
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Erro ao carregar post.' });
                    router.push('/admin/blog');
                })
                .finally(() => setIsLoading(false));
        }
    }, [postId, isNewPost, router, toast, form]);

    const imageHandler = useCallback(async () => {
        const editor = quillRef.current?.getEditor();
        if (!editor) {
            toast({ variant: 'destructive', title: 'Erro', description: 'O editor de texto não está pronto. Tente novamente.' });
            return;
        }

        const range = editor.getSelection(true);
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
                    toast({ variant: 'destructive', title: 'Arquivo Inválido', description: 'Por favor, selecione um arquivo de imagem.' });
                    return;
                }

                editor.insertEmbed(insertIndex, 'image', 'https://placehold.co/300x200.png?text=Comprimindo...');
                editor.setSelection(insertIndex + 1);

                try {
                    const options = {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    };
                    const compressedFile = await imageCompression(file, options);
                    
                    editor.deleteText(insertIndex, 1);
                    editor.insertEmbed(insertIndex, 'image', 'https://placehold.co/300x200.png?text=Enviando...');
                    editor.setSelection(insertIndex + 1);

                    const url = await firestoreApi.uploadImageForPost(compressedFile);
                    editor.deleteText(insertIndex, 1);
                    editor.insertEmbed(insertIndex, 'image', url);
                    editor.setSelection(insertIndex + 1);
                } catch (uploadError) {
                    editor.deleteText(insertIndex, 1);
                    const errorTyped = uploadError as { code?: string; message: string };
                    toast({
                        variant: 'destructive',
                        title: 'Erro no Upload',
                        description: <CopyableError userMessage="Não foi possível enviar a imagem." errorCode={errorTyped.code || errorTyped.message} />,
                    });
                }
            } finally {
                if (input.parentNode) {
                    input.parentNode.removeChild(input);
                }
            }
        };

        input.click();
    }, [toast]);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                ['link', 'image'],
                ['clean']
            ],
            // handlers are attached dynamically in useEffect
        },
        imageResize: {
            modules: ['Resize', 'DisplaySize', 'Toolbar'],
        },
    }), []);

    useEffect(() => {
        if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            if (editor) {
                editor.getModule('toolbar').addHandler('image', imageHandler);

                imageSetRef.current = new Set(getImageUrlsFromDelta(editor.getContents()));

                const textChangeHandler = (delta: any, oldDelta: any, source: string) => {
                    if (source === 'user') {
                        const currentImages = new Set(getImageUrlsFromDelta(editor.getContents()));
                        const previousImages = imageSetRef.current;
                        
                        const deletedUrls = [...previousImages].filter(url => !currentImages.has(url));

                        if (deletedUrls.length > 0) {
                            deletedUrls.forEach(url => {
                                firestoreApi.deleteImageFromUrl(url);
                            });
                        }
                        imageSetRef.current = currentImages;
                    }
                };
                
                editor.on('text-change', textChangeHandler);

                return () => {
                    editor.off('text-change', textChangeHandler);
                };
            }
        }
    }, [imageHandler]);

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
            if (isNewPost) {
                await firestoreApi.addPost(postData);
                toast({ title: 'Publicação criada com sucesso!' });
            } else {
                await firestoreApi.updatePost(postId, postData);
                toast({ title: 'Publicação atualizada com sucesso!' });
            }
            router.push('/admin/blog');
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: <CopyableError userMessage="Não foi possível salvar a publicação." errorCode={errorTyped.code || errorTyped.message} />,
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
        </div>
    )
}
