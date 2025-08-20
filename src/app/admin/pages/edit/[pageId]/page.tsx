
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import type { PageContent } from '@/lib/types';


const pageContentSchema = z.object({
    content: z.string().min(10, { message: 'O conteúdo deve ter pelo menos 10 caracteres.' }),
});

const QuillEditor = dynamic(() => import('react-quill').then((mod) => mod.default), { 
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full rounded-b-md" />
});

const getUrlsFromHtml = (html: string): string[] => {
  const urls = html.match(/https?:\/\/[^\s"]+/g) || [];
  return urls.filter(url => url.includes('firebasestorage.googleapis.com'));
};

const DEFAULT_CONTENT = {
    about: {
        title: "Quem Somos",
        content: `<h2>Nossa Missão</h2><p>Simplificar a gestão de produções audiovisuais, da ideia à finalização.</p><p>ProductionFlow é um produto da <span class="font-semibold">Candeeiro Filmes</span>.</p>`
    },
    contact: {
        title: "Contato",
        content: `<h2>Entre em Contato</h2><p>Estamos aqui para ajudar. Envie um e-mail para <a href="mailto:contato@productionflow.com" class="text-primary hover:underline">contato@productionflow.com</a>.</p>`
    },
    terms: {
        title: "Termos e Privacidade",
        content: `<h2>Termos de Uso e Política de Privacidade</h2><p>Bem-vindo ao ProductionFlow. Ao utilizar nosso aplicativo, você concorda com estes Termos de Uso e nossa Política de Privacidade.</p><h3>1. Aceitação dos Termos</h3><p>Ao criar uma conta e utilizar o ProductionFlow, você confirma que leu, entendeu e concorda em estar vinculado a estes termos. Se você não concordar, não utilize o serviço.</p><h3>2. Descrição do Serviço</h3><p>O ProductionFlow é uma plataforma projetada para auxiliar profissionais do audiovisual no gerenciamento financeiro e de produção de seus projetos. As funcionalidades incluem, mas não se limitam a, controle de orçamento, rastreamento de despesas, criação de ordens do dia e gestão de equipes.</p><h3>3. Contas de Usuário e Segurança</h3><p>Você é responsável por manter a confidencialidade de sua senha e conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta. O ProductionFlow não se responsabiliza por perdas ou danos decorrentes do seu descumprimento desta obrigação de segurança.</p><h3>4. Responsabilidade pelo Conteúdo do Usuário</h3><p><strong>Você é o único responsável por todos os dados, informações, textos, roteiros, imagens e outros materiais ("Conteúdo") que você cadastra, envia por upload, ou insere na plataforma.</strong> Isso inclui, mas não se limita a, informações financeiras, dados de projetos, e qualquer arquivo de mídia.</p><p>Ao fazer o upload de imagens ou qualquer outro conteúdo, você declara e garante que possui todos os direitos necessários (incluindo direitos autorais) para usar, armazenar e exibir esse conteúdo no ProductionFlow. O aplicativo atua como uma plataforma para hospedar seu conteúdo, e a responsabilidade legal sobre ele é inteiramente sua.</p><h3>5. Política de Privacidade e Conformidade com a LGPD</h3><p>Nós levamos sua privacidade a sério e estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil.</p><ul><li><strong>Coleta de Dados:</strong> Coletamos apenas os dados necessários para o funcionamento do aplicativo, como seu nome, e-mail e os dados dos projetos que você insere.</li><li><strong>Uso dos Dados:</strong> Seus dados são utilizados exclusivamente para fornecer e melhorar os serviços do ProductionFlow. As informações são armazenadas de forma segura nos servidores do Firebase (Google Cloud).</li><li><strong>Não Compartilhamento:</strong> Nós não vendemos, alugamos ou compartilhamos suas informações pessoais ou os dados de seus projetos com terceiros para fins de marketing ou qualquer outro fim não relacionado diretamente ao funcionamento do aplicativo.</li></ul><h3>6. Limitação de Responsabilidade</h3><p>O ProductionFlow é fornecido "como está", sem garantias de qualquer tipo. Em nenhuma circunstância seremos responsáveis por quaisquer danos diretos ou indiretos resultantes do uso ou da incapacidade de usar o serviço.</p><h3>7. Modificações nos Termos</h3><p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre alterações significativas. O uso contínuo do serviço após tais alterações constitui sua aceitação dos novos termos.</p><h3>8. Contato</h3><p>Se você tiver alguma dúvida sobre estes termos, entre em contato conosco através da nossa página de <a href="/contact" class="text-primary hover:underline">Contato</a>.</p>`
    }
}

export default function EditPageContentPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const quillRef = useRef<any>(null);
    const initialImageUrlsRef = useRef<Set<string>>(new Set());

    const pageId = params.pageId as 'about' | 'contact' | 'terms';

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
                    const content = page?.content || defaultData.content;
                    setPageTitle(page?.title || defaultData.title);
                    form.reset({ content });
                    initialImageUrlsRef.current = new Set(getUrlsFromHtml(content));
                })
                .catch((error) => {
                    const errorTyped = error as { code?: string; message: string };
                    toast({
                        variant: 'destructive',
                        title: `Erro em /admin/pages/edit/${pageId}/page.tsx (getPage)`,
                        description: <CopyableError userMessage="Não foi possível carregar o conteúdo da página." errorCode={errorTyped.code || errorTyped.message} />,
                    });
                })
                .finally(() => setIsLoading(false));
        }
    }, [pageId, toast, form]);

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

                editor.insertEmbed(insertIndex, 'image', 'https://placehold.co/300x200.png?text=Enviando...');
                editor.setSelection(insertIndex + 1);

                try {
                    const options = {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    };
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
                        title: `Erro em /admin/pages/edit/${pageId}/page.tsx (upload)`,
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
    }, [toast, pageId]);

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
    }), [imageHandler]);

    async function onSubmit(values: z.infer<typeof pageContentSchema>) {
        if (!user) return;
        setIsSaving(true);
        try {
            const pageData: Partial<PageContent> = {
                ...values,
                title: pageTitle,
            };
            
            const finalImageUrls = new Set(getUrlsFromHtml(values.content));
            const imageUrlsToDelete = [...initialImageUrlsRef.current].filter(
              url => !finalImageUrls.has(url)
            );

            await firestoreApi.updatePage(pageId, pageData);
            
            if (imageUrlsToDelete.length > 0) {
              await Promise.all(
                imageUrlsToDelete.map(url => firestoreApi.deleteImageFromUrl(url))
              );
            }

            toast({ title: 'Página atualizada com sucesso!' });
            router.push('/admin/pages');
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: `Erro em /admin/pages/edit/${pageId}/page.tsx (onSubmit)`,
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
