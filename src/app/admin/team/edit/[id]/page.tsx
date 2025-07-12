'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ArrowLeft, Loader2, Camera, User } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { TeamMemberAbout } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

const teamMemberSchema = z.object({
    name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
    role: z.string().min(2, { message: 'A função deve ter pelo menos 2 caracteres.' }),
    bio: z.string().min(10, { message: 'A bio deve ter pelo menos 10 caracteres.' }).max(200, { message: 'A bio não pode ter mais de 200 caracteres.' }),
    order: z.coerce.number().int().min(0, { message: 'A ordem deve ser um número positivo.' }),
    photoURL: z.string().url({ message: 'É necessário enviar uma foto.' }),
});

export default function EditTeamMemberPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const memberId = params.id as string;
    const isNewMember = memberId === 'new';

    const [isLoading, setIsLoading] = useState(!isNewMember);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const form = useForm<z.infer<typeof teamMemberSchema>>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: { name: '', role: '', bio: '', order: 0, photoURL: '' },
    });

    useEffect(() => {
        if (!isNewMember && memberId) {
            firestoreApi.getTeamMember(memberId)
                .then(member => {
                    if (member) {
                        form.reset(member);
                        setPhotoPreview(member.photoURL);
                    } else {
                        toast({ variant: 'destructive', title: 'Membro não encontrado.' });
                        router.push('/admin/team');
                    }
                })
                .catch((error) => {
                    const errorTyped = error as { code?: string; message: string };
                    toast({ 
                        variant: 'destructive',
                        title: 'Erro em /admin/team/edit/[id]/page.tsx (getTeamMember)',
                        description: <CopyableError userMessage="Não foi possível carregar os dados do membro." errorCode={errorTyped.code || errorTyped.message} />,
                    });
                    router.push('/admin/team');
                })
                .finally(() => setIsLoading(false));
        }
    }, [memberId, isNewMember, router, toast, form]);

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;

        const file = event.target.files[0];
        setIsUploading(true);
        setPhotoPreview(URL.createObjectURL(file));

        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 512,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            const url = await firestoreApi.uploadTeamMemberPhoto(compressedFile);
            form.setValue('photoURL', url, { shouldValidate: true });
            setPhotoPreview(url);
            toast({ title: 'Foto enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro de Upload',
                description: <CopyableError userMessage="Não foi possível enviar a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
            form.setValue('photoURL', '', { shouldValidate: true });
            setPhotoPreview(null);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    async function onSubmit(values: z.infer<typeof teamMemberSchema>) {
        setIsSaving(true);
        try {
            if (isNewMember) {
                await firestoreApi.addTeamMember(values);
                toast({ title: 'Membro da equipe adicionado com sucesso!' });
            } else {
                const { createdAt, ...updateValues } = values;
                await firestoreApi.updateTeamMember(memberId, updateValues);
                toast({ title: 'Membro da equipe atualizado com sucesso!' });
            }
            router.push('/admin/team');
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar o membro da equipe." errorCode={errorTyped.code || errorTyped.message} />,
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
                <Link href="/admin/team" className="flex items-center gap-2" aria-label="Voltar">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">{isNewMember ? 'Novo Membro' : 'Editar Membro'}</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                                <Avatar className="h-32 w-32">
                                    <AvatarImage src={photoPreview || undefined} alt="Foto do membro" className="object-cover" />
                                    <AvatarFallback className="text-4xl"><User /></AvatarFallback>
                                </Avatar>
                                <label 
                                    htmlFor="photo-upload" 
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    {isUploading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <Camera className="h-6 w-6" />
                                    )}
                                </label>
                                <input
                                    ref={fileInputRef}
                                    id="photo-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handlePhotoUpload}
                                    disabled={isUploading}
                                />
                                <FormField name="photoURL" control={form.control} render={() => <FormMessage className="mt-2 text-center" />} />
                            </div>
                            <div className="space-y-4 flex-1 w-full">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl><Input placeholder="Nome completo" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Função</FormLabel>
                                            <FormControl><Input placeholder="Ex: Diretor de Fotografia" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl><Textarea placeholder="Uma breve descrição sobre o membro da equipe..." {...field} rows={4} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                         <FormField
                            control={form.control}
                            name="order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ordem de Exibição</FormLabel>
                                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isSaving || isUploading}>
                            {(isSaving || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isNewMember ? 'Adicionar Membro' : 'Salvar Alterações'}
                        </Button>
                    </form>
                </Form>
            </main>
            <AppFooter />
        </div>
    )
}
