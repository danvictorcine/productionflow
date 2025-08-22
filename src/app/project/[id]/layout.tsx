
// @/src/app/project/[id]/layout.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Folder, DollarSign, Clapperboard, Brush, Image as ImageIcon, LayoutDashboard, Trash2, Loader2, Users } from 'lucide-react';

import type { UnifiedProject } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { useToast } from '@/hooks/use-toast';
import { CreateEditUnifiedProjectDialog } from '@/components/create-edit-unified-project-dialog';
import { AppFooter } from '@/components/app-footer';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


function ProjectLayoutDetail({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const projectId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [project, setProject] = useState<UnifiedProject | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    const isCreativePage = pathname.includes('/creative');
    const isStoryboardPage = pathname.includes('/storyboard');

    const fetchProject = useCallback(async () => {
        if (!projectId || !user) return;
        setIsLoading(true);
        try {
            const data = await firestoreApi.getUnifiedProject(projectId);
            if (data) {
                setProject(data);
            } else {
                toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
                router.push('/');
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar projeto',
                description: <CopyableError userMessage="Não foi possível carregar os dados do projeto." errorCode={(error as Error).message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [projectId, user, toast, router]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    const handleProjectUpdate = async (data: Omit<UnifiedProject, 'id' | 'userId' | 'createdAt'>) => {
        if (!project) return;
        await firestoreApi.updateUnifiedProject(project.id, data);
        setProject(prev => prev ? { ...prev, ...data } : null);
        toast({ title: 'Projeto atualizado com sucesso!' });
        setIsEditDialogOpen(false);
    };

    const tabs = useMemo(() => [
        { name: 'Dashboard', href: `/project/${projectId}/dashboard`, icon: LayoutDashboard },
        { name: 'Moodboard', href: `/project/${projectId}/creative`, icon: Brush },
        { name: 'Storyboard', href: `/project/${projectId}/storyboard`, icon: ImageIcon },
        { name: 'Financeiro', href: `/project/${projectId}/financial`, icon: DollarSign },
        { name: 'Ordem do Dia', href: `/project/${projectId}/production`, icon: Clapperboard },
    ], [projectId]);

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    if (!project) {
        return <div>Projeto não encontrado.</div>;
    }

    return (
        <div className={cn("flex flex-col w-full bg-background", (isCreativePage || isStoryboardPage) ? "h-screen" : "min-h-screen")}>
            <header className="sticky top-0 z-40 flex h-[60px] items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6 shrink-0">
                <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                        <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-lg md:text-xl font-bold text-primary truncate">{project.name}</h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                     <Button onClick={() => router.push('/talents')} variant="ghost" size="sm">
                        <Users className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Banco de Talentos</span>
                    </Button>
                    <Button onClick={() => setIsEditDialogOpen(true)} variant="ghost" size="sm">
                        <Edit className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Editar Projeto</span>
                    </Button>
                    <UserNav />
                </div>
            </header>

             <nav className="sticky top-[60px] z-30 border-b bg-background/95 backdrop-blur-sm shrink-0">
                <div className="px-2 sm:px-6 lg:px-8">
                <div className="flex -mb-px">
                    {tabs.map((tab) => (
                    <Link
                        key={tab.name}
                        href={tab.href}
                        className={cn(
                            'group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors',
                            pathname.startsWith(tab.href)
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-foreground font-medium hover:border-primary/80 hover:text-primary/80'
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        <span className="hidden md:inline truncate">{tab.name}</span>
                    </Link>
                    ))}
                </div>
                </div>
            </nav>

            <main className={cn("flex-1", (isCreativePage || isStoryboardPage) && "overflow-hidden")}>
                {children}
            </main>
            
            {!(isCreativePage || isStoryboardPage) && <AppFooter />}

            <CreateEditUnifiedProjectDialog
                isOpen={isEditDialogOpen}
                setIsOpen={setIsEditDialogOpen}
                onSubmit={handleProjectUpdate}
                project={project}
            />

        </div>
    );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <ProjectLayoutDetail>{children}</ProjectLayoutDetail>
        </AuthGuard>
    );
}
