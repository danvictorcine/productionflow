
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2, Camera, User, ArrowUp, ArrowDown } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Talent } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const talentSchema = z.object({
    id: z.string(),
    name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
    role: z.string().min(2, { message: 'A função deve ter pelo menos 2 caracteres.' }),
    photoURL: z.string().optional(),
    contact: z.string().optional(),
    file: z.instanceof(File).optional(),
});

const formSchema = z.object({
  talents: z.array(talentSchema),
});

type FormValues = z.infer<typeof formSchema>;

export default function ManageTalentsPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<Record<number, boolean>>({});

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            talents: [],
        },
    });

    const { control, handleSubmit, setValue, watch } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "talents",
    });

    const watchedTalents = watch('talents');

    useEffect(() => {
        firestoreApi.getTalents()
            .then(talents => {
                form.reset({ talents });
            })
            .catch((error) => {
                const errorTyped = error as { code?: string; message: string };
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar talentos',
                    description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
                });
            })
            .finally(() => setIsLoading(false));
    }, [form, toast]);

    const handlePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;
        
        const file = event.target.files[0];
        setValue(`talents.${index}.file`, file);

        setIsUploading(prev => ({ ...prev, [index]: true }));

        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 512,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            const url = await firestoreApi.uploadTalentPhoto(compressedFile);
            
            setValue(`talents.${index}.photoURL`, url, { shouldDirty: true });
            toast({ title: 'Foto enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro de Upload',
                description: <CopyableError userMessage="Não foi possível enviar a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsUploading(prev => ({ ...prev, [index]: false }));
        }
    };

    async function onSubmit(values: FormValues) {
        setIsSaving(true);
        try {
            await firestoreApi.saveTalents(values.talents);
            toast({ title: 'Banco de Talentos atualizado com sucesso!' });
            router.push('/admin');
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
                <Link href="/admin" className="flex items-center gap-2" aria-label="Voltar">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Gerenciar Banco de Talentos</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        <Alert>
                          <User className="h-4 w-4" />
                          <AlertTitle>Gerenciando seu Banco de Talentos</AlertTitle>
                          <AlertDescription>
                            Adicione, remova e edite os contatos da sua equipe. Estes contatos estarão disponíveis para serem selecionados em todos os seus projetos.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const photoURL = watchedTalents[index]?.photoURL;
                                const file = watchedTalents[index]?.file;
                                let previewUrl = photoURL;
                                if (file && !photoURL?.startsWith('https://firebasestorage')) {
                                    previewUrl = URL.createObjectURL(file);
                                }
                                
                                return (
                                <div key={field.id} className="flex items-start gap-3 p-4 border rounded-lg bg-card">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex flex-col sm:flex-row items-center gap-6">
                                            <div className="relative group">
                                                <Avatar className="h-32 w-32">
                                                    <AvatarImage src={previewUrl} alt="Foto do talento" className="object-cover" />
                                                    <AvatarFallback className="text-4xl"><User /></AvatarFallback>
                                                </Avatar>
                                                <label 
                                                    htmlFor={`photo-upload-${index}`}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                    {isUploading[index] ? (
                                                        <Loader2 className="h-6 w-6 animate-spin" />
                                                    ) : (
                                                        <Camera className="h-6 w-6" />
                                                    )}
                                                </label>
                                                <input
                                                    id={`photo-upload-${index}`}
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/png, image/jpeg"
                                                    onChange={(e) => handlePhotoUpload(index, e)}
                                                    disabled={isUploading[index]}
                                                />
                                            </div>
                                            <div className="space-y-4 flex-1 w-full">
                                                <FormField
                                                    control={control}
                                                    name={`talents.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Nome</FormLabel>
                                                            <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={control}
                                                    name={`talents.${index}.role`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Função Padrão</FormLabel>
                                                            <FormControl><Input placeholder="Ex: Diretor de Fotografia" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                  <FormField
                                                    control={control}
                                                    name={`talents.${index}.contact`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Contato (Telefone/Email)</FormLabel>
                                                            <FormControl><Input placeholder="Informação de contato" {...field} /></FormControl>
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
                            <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), name: '', role: '', photoURL: '', contact: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Talento
                            </Button>
                            <Button type="submit" disabled={isSaving || Object.values(isUploading).some(v => v)}>
                                {(isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
