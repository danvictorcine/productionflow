'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Post } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { useToast } from '@/hooks/use-toast';
import { AppFooter } from '@/components/app-footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { CopyableError } from '@/components/copyable-error';

export default function ManageBlogPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);

    const fetchPosts = async () => {
        setIsLoading(true);
        try {
            const fetchedPosts = await firestoreApi.getPosts();
            setPosts(fetchedPosts);
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /admin/blog/page.tsx (fetchPosts)',
                description: <CopyableError userMessage="Não foi possível carregar as publicações." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleConfirmDelete = async () => {
        if (!postToDelete) return;
        try {
            await firestoreApi.deletePost(postToDelete.id);
            toast({ title: 'Post excluído!' });
            await fetchPosts();
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /admin/blog/page.tsx (handleConfirmDelete)',
                description: <CopyableError userMessage="Não foi possível excluir a publicação." errorCode={errorTyped.code || errorTyped.message} />,
            });
        }
        setPostToDelete(null);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
            )
        }

        if (posts.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[300px]">
                    <h3 className="text-lg font-semibold">Nenhuma publicação encontrada</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Comece criando sua primeira publicação para o blog.</p>
                    <Button asChild className="mt-6">
                        <Link href="/admin/blog/edit/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar Publicação
                        </Link>
                    </Button>
                </div>
            );
        }

        return (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {posts.map(post => (
                    <Card key={post.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="truncate">{post.title}</CardTitle>
                            <CardDescription>{format(post.createdAt, "dd 'de' MMMM, yyyy", { locale: ptBR })}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-end">
                            <div className="flex justify-between items-center">
                                <Button asChild variant="outline">
                                    <Link href={`/admin/blog/edit/${post.id}`}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setPostToDelete(post)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                ))}
             </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
                <Link href="/admin" className="flex items-center gap-2" aria-label="Voltar para o Painel">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-lg md:text-xl font-bold truncate">Gerenciar Blog</h1>
                <div className="ml-auto flex items-center gap-2">
                    <Button asChild size="sm" className="md:size-auto">
                         <Link href="/admin/blog/edit/new">
                            <PlusCircle className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Criar Publicação</span>
                        </Link>
                    </Button>
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {renderContent()}
            </main>
            <AppFooter />

             <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente a publicação "{postToDelete?.title}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                    >
                    Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
