

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form';
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
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const carouselImageSchema = z.object({
  id: z.string(),
  url: z.string().url({ message: 'É necessário enviar uma imagem.' }).or(z.literal('')),
  file: z.instanceof(File).optional(),
});

const formSchema = z.object({
  carouselImages: z.array(carouselImageSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            carouselImages: [],
        },
    });

    const { control, handleSubmit, setValue, watch, trigger } = form;
    const { fields: carouselFields, append: appendCarousel, remove: removeCarousel, move: moveCarousel } = useFieldArray({ control, name: "carouselImages" });

    const watchedImages = watch('carouselImages');

    useEffect(() => {
        firestoreApi.getLoginPageContent()
            .then(content => {
                form.reset({ 
                    carouselImages: content.carouselImages || [],
                });
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

    async function onSubmit(values: FormValues) {
        setIsSaving(true);
        try {
            const contentToSave: LoginPageContent = {
                carouselImages: values.carouselImages.map(({ file, ...rest }) => rest),
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
    
    const onInvalid = (errors: FieldErrors<FormValues>) => {
      console.error("Validation Errors:", errors);
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: <CopyableError 
          userMessage="Por favor, corrija os erros antes de salvar." 
          errorCode={JSON.stringify(errors, null, 2)}
        />
      })
    };


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
                    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">

                        <Alert>
                          <ImageIcon className="h-4 w-4" />
                          <AlertTitle>Gerenciando Carrossel de Imagens</AlertTitle>
                          <AlertDescription>
                            Adicione, remova e reordene as imagens que aparecem no carrossel da página de login.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-4">
                            {carouselFields.map((field, index) => {
                                 const imageUrl = watchedImages[index]?.url;
                                 const file = watchedImages[index]?.file;
                                 let previewUrl = imageUrl;
                                 if (file && !imageUrl?.startsWith('https://firebasestorage')) {
                                     previewUrl = URL.createObjectURL(file);
                                 }

                                return (
                                <div key={field.id} className="flex items-center gap-3 p-4 border rounded-lg bg-card">
                                    <div className="flex flex-col gap-2 pt-1">
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" disabled={index === 0} onClick={() => moveCarousel(index, index - 1)} aria-label="Mover para cima"><ArrowUp className="h-4 w-4" /></Button>
                                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" disabled={index === carouselFields.length - 1} onClick={() => moveCarousel(index, index + 1)} aria-label="Mover para baixo"><ArrowDown className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="relative group w-48 flex-shrink-0">
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
                                        <input id={`image-upload-${index}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleCarouselImageUpload(index, e)} disabled={isUploading[String(index)]} />
                                        <FormField name={`carouselImages.${index}.url`} control={control} render={() => <FormMessage className="mt-2 text-center" />} />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive ml-auto" onClick={() => removeCarousel(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )})}
                             <Button type="button" variant="outline" onClick={() => appendCarousel({ id: crypto.randomUUID(), url: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Imagem ao Carrossel
                            </Button>
                        </div>
                        
                        <Separator className="my-8" />

                        <Button type="submit" disabled={isSaving || Object.values(isUploading).some(v => v)}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </form>
                </Form>
            </main>
            <AppFooter />
        </div>
    )
}
