
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Upload, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { LoginCarouselImage, LoginPageContent } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

const carouselImageSchema = z.object({
  id: z.string(),
  url: z.string().url({ message: 'É necessário enviar uma imagem.' }),
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  file: z.instanceof(File).optional(),
});

const formSchema = z.object({
  carouselImages: z.array(carouselImageSchema),
  backgroundImageUrl: z.string().optional(),
  isBackgroundEnabled: z.boolean().optional(),
});

export default function EditLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<Record<number, boolean>>({});
    const [isBgUploading, setIsBgUploading] = useState(false);
    const [previewBgUrl, setPreviewBgUrl] = useState<string | undefined>('');


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            carouselImages: [],
            backgroundImageUrl: '',
            isBackgroundEnabled: false,
        },
    });

    const { control, handleSubmit, setValue, watch, trigger } = form;
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "carouselImages",
    });

    const backgroundImageUrl = watch('backgroundImageUrl');
    const watchedImages = watch('carouselImages');

    useEffect(() => {
        firestoreApi.getLoginPageContent()
            .then(content => {
                form.reset({ 
                    carouselImages: content.carouselImages || [],
                    backgroundImageUrl: content.backgroundImageUrl || '',
                    isBackgroundEnabled: content.isBackgroundEnabled || false
                });
                setPreviewBgUrl(content.backgroundImageUrl);
            })
            .catch((error) => {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar dados',
                    description: <CopyableError userMessage="Não foi possível carregar os dados da página de login." errorCode={errorTyped.code || errorTyped.message} />,
                });
            })
            .finally(() => setIsLoading(false));
    }, [form, toast]);

    const handleBgImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;
        
        const file = event.target.files[0];
        const tempPreviewUrl = URL.createObjectURL(file);
        setPreviewBgUrl(tempPreviewUrl);
        setIsBgUploading(true);
        

        try {
            const options = { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true };
            const compressedBlob = await imageCompression(file, options);
            const compressedFile = new File([compressedBlob], file.name, { type: file.type, lastModified: Date.now() });

            const url = await firestoreApi.uploadLoginBackground(compressedFile);
            
            if (backgroundImageUrl) {
                try {
                    await firestoreApi.deleteImageFromUrl(backgroundImageUrl);
                } catch (deleteError) {
                    console.warn("Could not delete old background image, continuing...", deleteError);
                }
            }

            setValue('backgroundImageUrl', url, { shouldDirty: true });
            setPreviewBgUrl(url);
            toast({ title: 'Imagem de fundo enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro de Upload',
                description: <CopyableError userMessage="Não foi possível enviar a imagem de fundo." errorCode={errorTyped.code || errorTyped.message} />,
            });
            setPreviewBgUrl(backgroundImageUrl);
        } finally {
            setIsBgUploading(false);
            URL.revokeObjectURL(tempPreviewUrl);
        }
    };
    
    const handleCarouselImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;
        
        const file = event.target.files[0];
        setValue(`carouselImages.${index}.file`, file);

        setIsUploading(prev => ({ ...prev, [index]: true }));

        try {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const url = await firestoreApi.uploadImageForPageContent(compressedFile);
            
            setValue(`carouselImages.${index}.url`, url, { shouldDirty: true });
            trigger(`carouselImages.${index}.url`);
            toast({ title: 'Foto enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro de Upload',
                description: <CopyableError userMessage="Não foi possível enviar a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
             setValue(`carouselImages.${index}.url`, '', { shouldDirty: true });
        } finally {
            setIsUploading(prev => ({ ...prev, [index]: false }));
        }
    };

    const handleRemoveImage = async () => {
        if (!backgroundImageUrl) return;
        try {
            await firestoreApi.deleteImageFromUrl(backgroundImageUrl);
            setValue('backgroundImageUrl', '', { shouldDirty: true });
            setPreviewBgUrl('');
            toast({ title: 'Imagem de fundo removida.' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao remover',
                description: <CopyableError userMessage="Não foi possível remover a imagem de fundo." errorCode={errorTyped.code || errorTyped.message} />,
            });
        }
    };


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        try {
            const features = (await firestoreApi.getLoginPageContent()).features; // Preserve existing features
            const contentToSave: LoginPageContent = {
                features,
                carouselImages: values.carouselImages.map(({ file, ...rest }) => rest),
                backgroundImageUrl: values.backgroundImageUrl || '',
                isBackgroundEnabled: values.isBackgroundEnabled || false,
            };
            await firestoreApi.saveLoginPageContent(contentToSave);
            toast({ title: 'Página de login atualizada com sucesso!' });
            router.push('/admin/pages');
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar as alterações." errorCode={errorTyped.code || errorTyped.message} />,
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
                <Link href="/admin/pages" className="flex items-center gap-2" aria-label="Voltar">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Editando: Página de Login</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-medium">Imagem de Fundo</h3>
                             <FormField
                                control={control}
                                name="isBackgroundEnabled"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Habilitar Imagem de Fundo</FormLabel>
                                            <p className="text-[0.8rem] text-muted-foreground">
                                                Exibe a imagem carregada como fundo da seção.
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={() => document.getElementById('bg-upload')?.click()} disabled={isBgUploading}>
                                    {isBgUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    {backgroundImageUrl ? "Substituir Imagem" : "Enviar Imagem"}
                                </Button>
                                {backgroundImageUrl && (
                                    <Button type="button" variant="destructive" onClick={handleRemoveImage}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remover
                                    </Button>
                                )}
                                <input id="bg-upload" type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                            </div>
                            {isBgUploading && (
                                <div className="mt-4 relative w-full aspect-video rounded-md overflow-hidden border">
                                    <Image src={previewBgUrl || ''} alt="Prévia da imagem de fundo" layout="fill" objectFit="cover" />
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                                    </div>
                                </div>
                            )}
                            {!isBgUploading && previewBgUrl && (
                                <div className="mt-4 relative w-full aspect-video rounded-md overflow-hidden border">
                                    <Image src={previewBgUrl} alt="Prévia da imagem de fundo" layout="fill" objectFit="cover" />
                                </div>
                            )}
                        </div>
                        

                        <Alert>
                          <ImageIcon className="h-4 w-4" />
                          <AlertTitle>Gerenciando Carrossel de Imagens</AlertTitle>
                          <AlertDescription>
                            Adicione, remova, edite e reordene as imagens que aparecem no carrossel da página de login.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                 const imageUrl = watchedImages[index]?.url;
                                 const file = watchedImages[index]?.file;
                                 let previewUrl = imageUrl;
                                 if (file && !imageUrl?.startsWith('https://firebasestorage')) {
                                     previewUrl = URL.createObjectURL(file);
                                 }

                                return (
                                <div key={field.id} className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                                    <div className="flex flex-col gap-2 pt-1">
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Mover para cima"><ArrowUp className="h-4 w-4" /></Button>
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label="Mover para baixo"><ArrowDown className="h-4 w-4" /></Button>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-col sm:flex-row items-center gap-6">
                                             <div className="relative group w-full sm:w-48 flex-shrink-0">
                                                 <div className="aspect-video w-full bg-muted rounded-md overflow-hidden border flex items-center justify-center">
                                                     {previewUrl ? (
                                                         <Image src={previewUrl} alt="Prévia" layout="fill" objectFit="cover" />
                                                     ) : (
                                                         <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                                     )}
                                                 </div>
                                                <label 
                                                    htmlFor={`image-upload-${index}`}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                                                >
                                                    {isUploading[index] ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                                                </label>
                                                <input id={`image-upload-${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleCarouselImageUpload(index, e)} disabled={isUploading[index]} />
                                                <FormField name={`carouselImages.${index}.url`} control={control} render={() => <FormMessage className="mt-2 text-center" />} />
                                            </div>
                                            <div className="space-y-4 flex-1 w-full">
                                                <FormField
                                                    control={control}
                                                    name={`carouselImages.${index}.title`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Título</FormLabel>
                                                            <FormControl><Input {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={control}
                                                    name={`carouselImages.${index}.description`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Descrição</FormLabel>
                                                            <FormControl><Textarea {...field} rows={2} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )})}
                        </div>
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), url: '', title: '', description: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Imagem ao Carrossel
                            </Button>
                            <Button type="submit" disabled={isSaving || isBgUploading || Object.values(isUploading).some(v => v)}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Form>
            </main>
            <AppFooter />
        </div>
    )
}
