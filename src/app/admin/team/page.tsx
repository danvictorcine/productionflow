'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';

import type { TeamMemberAbout } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function ManageTeamPage() {
    const { toast } = useToast();
    const [members, setMembers] = useState<TeamMemberAbout[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [memberToDelete, setMemberToDelete] = useState<TeamMemberAbout | null>(null);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const fetchedMembers = await firestoreApi.getTeamMembers();
            setMembers(fetchedMembers);
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /admin/team/page.tsx (fetchMembers)',
                description: <CopyableError userMessage="Não foi possível carregar os membros da equipe." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleConfirmDelete = async () => {
        if (!memberToDelete) return;
        try {
            await firestoreApi.deleteTeamMember(memberToDelete.id);
            toast({ title: 'Membro da equipe excluído!' });
            await fetchMembers();
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro em /admin/team/page.tsx (handleConfirmDelete)',
                description: <CopyableError userMessage="Não foi possível excluir o membro da equipe." errorCode={errorTyped.code || errorTyped.message} />,
            });
        }
        setMemberToDelete(null);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
                </div>
            )
        }

        if (members.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[300px]">
                    <h3 className="text-lg font-semibold">Nenhum membro da equipe encontrado</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Comece adicionando o primeiro membro da sua equipe.</p>
                    <Button asChild className="mt-6">
                        <Link href="/admin/team/edit/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Adicionar Membro
                        </Link>
                    </Button>
                </div>
            );
        }

        return (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {members.map(member => (
                    <Card key={member.id} className="flex flex-col">
                        <CardHeader className="flex-row items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={member.photoURL} alt={member.name} />
                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="truncate">{member.name}</CardTitle>
                                <CardDescription>{member.role}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-end">
                            <div className="flex justify-between items-center">
                                <Button asChild variant="outline">
                                    <Link href={`/admin/team/edit/${member.id}`}>
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setMemberToDelete(member)} className="text-destructive focus:text-destructive">
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
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/admin" className="flex items-center gap-2" aria-label="Voltar para o Painel">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Gerenciar Equipe</h1>
                <div className="ml-auto flex items-center gap-4">
                    <Button asChild>
                         <Link href="/admin/team/edit/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro
                        </Link>
                    </Button>
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {renderContent()}
            </main>
            <AppFooter />

             <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o membro da equipe "{memberToDelete?.name}".
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
