
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { LoginFeature, LoginPageContent } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { featureIcons, type FeatureIconName } from '@/lib/icons';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

const featureSchema = z.object({
    id: z.string(),
    icon: z.string().min(1, "Ícone é obrigatório."),
    title: z.string().min(3, "Título deve ter pelo menos 3 caracteres."),
    description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres."),
});

const formSchema = z.object({
  features: z.array(featureSchema),
  backgroundImageUrl: z.string().optional(),
  isBackgroundEnabled: z.boolean().optional(),
});

export default function EditLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>('');


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            features: [],
            backgroundImageUrl: '',
            isBackgroundEnabled: false,
        },
    });

    const { control, handleSubmit, setValue, watch } = form;
    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "features",
    });

    const backgroundImageUrl = watch('backgroundImageUrl');

    useEffect(() => {
        firestoreApi.getLoginPageContent()
            .then(content => {
                form.reset({ 
                    features: content.features,
                    backgroundImageUrl: content.backgroundImageUrl || '',
                    isBackgroundEnabled: content.isBackgroundEnabled || false
                });
                setPreviewUrl(content.backgroundImageUrl);
            })
            .catch(() => {
                toast({ variant: 'destructive', title: 'Erro ao carregar conteúdo da página de login.' });
            })
            .finally(() => setIsLoading(false));
    }, [form, toast]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;
        
        setIsUploading(true);
        const file = event.target.files[0];

        try {
            const options = {
                maxSizeMB: 2,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            const url = await firestoreApi.uploadLoginBackground(compressedFile);
            
            // Delete old image if it exists
            if (backgroundImageUrl) {
                try {
                    await firestoreApi.deleteImageFromUrl(backgroundImageUrl);
                } catch (deleteError) {
                    console.warn("Could not delete old background image, continuing...", deleteError);
                }
            }

            setValue('backgroundImageUrl', url, { shouldDirty: true });
            setPreviewUrl(url);
            toast({ title: 'Imagem de fundo enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro no Upload',
                description: <CopyableError userMessage="Não foi possível enviar a imagem." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = async () => {
        if (!backgroundImageUrl) return;

        try {
            await firestoreApi.deleteImageFromUrl(backgroundImageUrl);
            setValue('backgroundImageUrl', '', { shouldDirty: true });
            setPreviewUrl('');
            toast({ title: 'Imagem de fundo removida.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao remover imagem.' });
        }
    };


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSaving(true);
        try {
            const featuresToSave = values.features.map(({ id, ...rest }) => rest);
            const contentToSave: Omit<LoginPageContent, 'features'> & { features: Omit<LoginFeature, 'id'>[] } = {
                features: featuresToSave,
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
                title: 'Erro ao salvar',
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
                    <Button variant="outline" size="icon" className="h-8 w-8">
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
                                                Exibe a imagem carregada como fundo da seção de features.
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
                                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    {backgroundImageUrl ? "Substituir Imagem" : "Enviar Imagem"}
                                </Button>
                                {backgroundImageUrl && (
                                    <Button type="button" variant="destructive" onClick={handleRemoveImage}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remover
                                    </Button>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>
                            {previewUrl && (
                                <div className="mt-4 relative w-full h-48 rounded-md overflow-hidden border">
                                    <Image src={previewUrl} alt="Prévia da imagem de fundo" layout="fill" objectFit="cover" />
                                </div>
                            )}
                        </div>
                        

                        <Alert>
                          <ImageIcon className="h-4 w-4" />
                          <AlertTitle>Gerenciando Cards de Features</AlertTitle>
                          <AlertDescription>
                            Adicione, remova, edite e reordene os cards que aparecem na página de login para destacar as funcionalidades do seu app.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-2 p-4 border rounded-lg bg-card">
                                    <div className="flex flex-col gap-2 pt-1">
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Mover para cima">▲</Button>
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" disabled={index === fields.length - 1} onClick={() => move(index, index + 1)} aria-label="Mover para baixo">▼</Button>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-4">
                                            <FormField
                                                control={control}
                                                name={`features.${index}.icon`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>Ícone</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione um ícone" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {Object.keys(featureIcons).map(iconName => (
                                                                <SelectItem key={iconName} value={iconName}>
                                                                    <div className="flex items-center gap-2">
                                                                        {React.cloneElement(featureIcons[iconName as FeatureIconName], {className: "h-4 w-4"})}
                                                                        {iconName}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={control}
                                                name={`features.${index}.title`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Título</FormLabel>
                                                        <FormControl><Input {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={control}
                                            name={`features.${index}.description`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Descrição</FormLabel>
                                                    <FormControl><Textarea {...field} rows={3} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), icon: 'DollarSign', title: '', description: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Novo Card
                            </Button>
                            <Button type="submit" disabled={isSaving || isUploading}>
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
