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

import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';

const pageContentSchema = z.object({
    content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
});

const QuillEditor = dynamic(() => import('react-quill'), { 
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-b-md" />
});

const DEFAULT_CONTENT = {
    about: {
        title: "Quem Somos",
        content: `<h2>Nossa Missão</h2><p>Simplificar a gestão de produções audiovisuais, da ideia à finalização.</p><p>ProductionFlow é um produto da <span class="font-semibold text-foreground">Candeeiro Filmes</span>.</p>`
    },
    contact: {
        title: "Contato",
        content: `<h2>Entre em Contato</h2><p>Estamos aqui para ajudar. Envie um e-mail para <a href="mailto:contato@productionflow.com" class="text-primary hover:underline">contato@productionflow.com</a>.</p>`
    }
}

export default function EditPageContentPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const quillRef = useRef<any>(null);

    const pageId = params.pageId as 'about' | 'contact';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [pageTitle, setPageTitle] = useState('');

    const form = useForm<z.infer<typeof pageContentSchema>>({
        resolver: zodResolver(pageContentSchema),
        defaultValues: { content: '' },
    });

    useEffect(() => {
        if (pageId) {
            firestoreApi.getPage(pageId)
                .then(page => {
                    const defaultData = DEFAULT_CONTENT[pageId] || { title: "Página Desconhecida", content: "" };
                    setPageTitle(page?.title || defaultData.title);
                    form.reset({ content: page?.content || defaultData.content });
                })
                .catch(() => {
                    toast({ variant: 'destructive', title: 'Erro ao carregar conteúdo da página.' });
                })
                .finally(() => setIsLoading(false));
        }
    }, [pageId, toast, form]);

    const imageHandler = async () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            if (!input.files) return;
            const file = input.files[0];
            if (/^image\//.test(file.type)) {
                const editor = quillRef.current?.getEditor();
                const range = editor?.getSelection(true);
                if (range) {
                    try {
                        const url = await firestoreApi.uploadImageForPost(file); // Reusing blog image uploader
                        editor.insertEmbed(range.index, 'image', url);
                        editor.setSelection(range.index + 1);
                    } catch (error) {
                        toast({ variant: 'destructive', title: 'Erro no Upload', description: 'Não foi possível enviar a imagem.' });
                    }
                }
            } else {
                toast({ variant: 'destructive', title: 'Arquivo Inválido', description: 'Por favor, selecione um arquivo de imagem.' });
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
    }), []);

    async function onSubmit(values: z.infer<typeof pageContentSchema>) {
        if (!user) return;
        setIsSaving(true);
        try {
            const pageData = {
                ...values,
                title: pageTitle,
            };
            await firestoreApi.updatePage(pageId, pageData);
            toast({ title: 'Página atualizada com sucesso!' });
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
                <h1 className="text-xl font-bold">Editando: {pageTitle}</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Conteúdo da Página</FormLabel>
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
                            Salvar Alterações
                        </Button>
                    </form>
                </Form>
            </main>
            <AppFooter />
        </div>
    )
}
