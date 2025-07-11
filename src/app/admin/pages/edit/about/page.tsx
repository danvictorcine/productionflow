'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { AboutPageContent, AboutPageTeamMember } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const QuillEditor = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-b-md" />
});

const teamMemberSchema = z.object({
    id: z.string(),
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    role: z.string().min(2, "O cargo deve ter pelo menos 2 caracteres."),
    photoUrl: z.string().optional(),
    bio: z.string().optional(),
});

const pageContentSchema = z.object({
    content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
    team: z.array(teamMemberSchema),
});

const getImageUrlsFromDelta = (delta: any): string[] => {
  if (!delta || !Array.isArray(delta.ops)) return [];
  return delta.ops.reduce((urls: string[], op: any) => {
    if (op.insert && op.insert.image && op.insert.image.startsWith('https://firebasestorage.googleapis.com')) {
      urls.push(op.insert.image);
    }
    return urls;
  }, []);
};

export default function EditAboutPage() {
    const router = useRouter();
    const { toast } = useToast();
    const quillRef = useRef<any>(null);
    const imageSetRef = useRef<Set<string>>(new Set());
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [pageTitle, setPageTitle] = useState('');
    const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

    const form = useForm<z.infer<typeof pageContentSchema>>({
        resolver: zodResolver(pageContentSchema),
        defaultValues: { content: '', team: [] },
    });

    const { control, handleSubmit, setValue, getValues, watch } = form;
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "team",
    });

    useEffect(() => {
        firestoreApi.getPage('about')
            .then(page => {
                const defaultContent = {
                    title: "Quem Somos",
                    content: `<h2>Nossa Missão</h2><p>Simplificar a gestão de produções audiovisuais, da ideia à finalização.</p><p>ProductionFlow é um produto da <span class="font-semibold text-foreground">Candeeiro Filmes</span>.</p>`,
                    team: []
                };
                setPageTitle(page?.title || defaultContent.title);
                form.reset({
                    content: page?.content || defaultContent.content,
                    team: page?.team || defaultContent.team,
                });
            })
            .catch((error) => {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar página',
                    description: <CopyableError userMessage="Não foi possível carregar o conteúdo da página." errorCode={errorTyped.code || errorTyped.message} />,
                });
            })
            .finally(() => setIsLoading(false));
    }, [toast, form]);

    const handleTeamMemberImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, memberId: string, memberIndex: number) => {
        if (!event.target.files?.[0]) return;
        
        setUploadingImageId(memberId);
        const file = event.target.files[0];
        const oldUrl = getValues(`team.${memberIndex}.photoUrl`);

        try {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 512, useWebWorker: true };
            const compressedBlob = await imageCompression(file, options);
            
            // Create a new File object from the compressed blob, preserving the original name
            const compressedFile = new File([compressedBlob], file.name, {
                type: file.type,
                lastModified: Date.now(),
            });

            const url = await firestoreApi.uploadAboutTeamMemberPhoto(compressedFile, memberId);

            setValue(`team.${memberIndex}.photoUrl`, url, { shouldDirty: true });
            
            // Delete old photo *after* successful upload
            if (oldUrl) {
                await firestoreApi.deleteImageFromUrl(oldUrl);
            }
            
            toast({ title: 'Foto do membro atualizada!' });

        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro no Upload',
                description: <CopyableError userMessage="Não foi possível enviar a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setUploadingImageId(null);
            if (event.target) event.target.value = "";
        }
    }, [getValues, setValue, toast]);
    
    const handleRemoveTeamMemberImage = async (memberIndex: number) => {
        const url = getValues(`team.${memberIndex}.photoUrl`);
        if (!url) return;
        try {
            await firestoreApi.deleteImageFromUrl(url);
            setValue(`team.${memberIndex}.photoUrl`, '', { shouldDirty: true });
            toast({ title: 'Foto do membro removida.' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao remover foto',
                description: <CopyableError userMessage="Não foi possível remover a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
        }
    };


    // Quill handlers
    const imageHandler = useCallback(async () => {
        const editor = quillRef.current?.getEditor();
        if (!editor) return;
        const range = editor.getSelection(true);
        const input = document.createElement('input');
        input.setAttribute('type', 'file'); input.setAttribute('accept', 'image/*');
        document.body.appendChild(input);

        input.onchange = async () => {
            try {
                if (!input.files || input.files.length === 0) return;
                const file = input.files[0];
                const insertIndex = range ? range.index : 0;
                editor.insertEmbed(insertIndex, 'image', 'https://placehold.co/300x200.png?text=Enviando...');
                
                const compressedBlob = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
                const compressedFile = new File([compressedBlob], file.name, { type: file.type, lastModified: Date.now() });

                const url = await firestoreApi.uploadImageForPageContent(compressedFile);
                editor.deleteText(insertIndex, 1);
                editor.insertEmbed(insertIndex, 'image', url);
                editor.setSelection(insertIndex + 1);
            } catch (error) {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro no Upload',
                    description: <CopyableError userMessage="Não foi possível enviar a imagem." errorCode={errorTyped.code || errorTyped.message} />,
                });
            } finally {
                if (input.parentNode) input.parentNode.removeChild(input);
            }
        };
        input.click();
    }, [toast]);

    const modules = useMemo(() => ({
        toolbar: {
            container: [['bold', 'italic', 'underline'], [{'list': 'bullet'}], ['link', 'image'], ['clean']],
            handlers: { image: imageHandler }
        },
    }), [imageHandler]);

    useEffect(() => {
        if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            if (editor) {
                imageSetRef.current = new Set(getImageUrlsFromDelta(editor.getContents()));
                const textChangeHandler = (delta: any, oldDelta: any, source: string) => {
                    if (source === 'user') {
                        const currentImages = new Set(getImageUrlsFromDelta(editor.getContents()));
                        [...imageSetRef.current].filter(url => !currentImages.has(url)).forEach(firestoreApi.deleteImageFromUrl);
                        imageSetRef.current = currentImages;
                    }
                };
                editor.on('text-change', textChangeHandler);
                return () => editor.off('text-change', textChangeHandler);
            }
        }
    }, [imageHandler]);

    async function onSubmit(values: z.infer<typeof pageContentSchema>) {
        setIsSaving(true);
        try {
            await firestoreApi.updatePage('about', { ...values, title: pageTitle });
            toast({ title: 'Página atualizada com sucesso!' });
            router.push('/admin/pages');
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar página',
                description: <CopyableError userMessage="Não foi possível salvar as alterações." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <div className="p-8 space-y-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-64 w-full" /></div>;
    }
    
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/admin/pages" aria-label="Voltar"><Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-xl font-bold">Editando: {pageTitle}</h1>
                <div className="ml-auto flex items-center gap-4"><UserNav /></div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                         <FormField control={form.control} name="content" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Conteúdo da Página</FormLabel>
                                <FormControl><QuillEditor ref={quillRef} value={field.value} onChange={field.onChange} modules={modules} theme="snow" /></FormControl>
                                <FormMessage />
                            </FormItem>
                         )}/>
                        
                        <Separator />

                        <div className="space-y-4">
                           <h3 className="text-2xl font-bold tracking-tight">Nossa Equipe</h3>
                           {fields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card">
                                    <div className="flex flex-col gap-2 pt-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => move(index, index - 1)}>▲</Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)}>▼</Button>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Image src={watch(`team.${index}.photoUrl`) || 'https://placehold.co/100x100.png'} width={80} height={80} alt="Foto do membro" className="rounded-full h-20 w-20 object-cover border" />
                                                {uploadingImageId === field.id && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-white"/></div>}
                                            </div>
                                            <div className="space-y-2">
                                                 <Button type="button" size="sm" variant="outline" onClick={() => fileInputRefs.current[field.id]?.click()} disabled={!!uploadingImageId}>
                                                    <Upload className="mr-2 h-4 w-4" />{watch(`team.${index}.photoUrl`) ? 'Trocar Foto' : 'Enviar Foto'}
                                                </Button>
                                                {watch(`team.${index}.photoUrl`) && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveTeamMemberImage(index)}><Trash2 className="mr-2 h-4 w-4"/>Remover Foto</Button>}
                                                <input ref={el => fileInputRefs.current[field.id] = el} type="file" accept="image/*" className="hidden" onChange={(e) => handleTeamMemberImageUpload(e, field.id, index)} />
                                            </div>
                                        </div>
                                        <FormField control={control} name={`team.${index}.name`} render={({ field }) => (
                                            <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={control} name={`team.${index}.role`} render={({ field }) => (
                                            <FormItem><FormLabel>Cargo/Função</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={control} name={`team.${index}.bio`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bio <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                                                <FormControl><Textarea placeholder="Uma breve descrição sobre o membro da equipe." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), name: '', role: '', photoUrl: '', bio: '' })}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Membro da Equipe
                        </Button>
                        
                        <Separator />
                        
                        <Button type="submit" disabled={isSaving || !!uploadingImageId}>
                            {(isSaving || !!uploadingImageId) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Página
                        </Button>
                    </form>
                </Form>
            </main>
            <AppFooter />
        </div>
    );
}
