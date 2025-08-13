
// src/app/project/[id]/creative/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { CreativeProject, BoardItem, UnifiedProject } from '@/lib/types';
import * as api from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { Skeleton } from '@/components/ui/skeleton';
import CreativeProjectPageDetail from '@/components/creative-project-page-detail';
import { Brush, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CreativeProjectUnifiedPage() {
    const router = useRouter();
    const params = useParams();
    const unifiedProjectId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [unifiedProject, setUnifiedProject] = useState<UnifiedProject | null>(null);
    const [creativeProject, setCreativeProject] = useState<CreativeProject | null>(null);
    const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCreativeData = useCallback(async () => {
        if (!unifiedProjectId || !user) return;
        setIsLoading(true);

        try {
            const uProject = await api.getUnifiedProject(unifiedProjectId);
            if (!uProject) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
                router.push('/');
                return;
            }
            setUnifiedProject(uProject);

            if (uProject.creativeProjectId) {
                const creativeData = await api.getCreativeProject(uProject.creativeProjectId);
                const itemsData = await api.getBoardItems(uProject.creativeProjectId);
                setCreativeProject(creativeData);
                setBoardItems(itemsData);
            } else {
                setCreativeProject(null);
                setBoardItems([]);
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar moodboard',
                description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [unifiedProjectId, user, router, toast]);

    useEffect(() => {
        fetchCreativeData();
    }, [fetchCreativeData]);

    const handleCreateCreativeProject = async () => {
        if (!unifiedProject) return;
        setIsLoading(true);
        try {
            const newCreativeProjectData = {
                name: unifiedProject.name,
                description: unifiedProject.description,
                unifiedProjectId: unifiedProject.id,
            };
            const newCreativeId = await api.addCreativeProject(newCreativeProjectData);
            await api.updateUnifiedProject(unifiedProject.id, { creativeProjectId: newCreativeId });
            toast({ title: 'Moodboard Criado!' });
            await fetchCreativeData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o moodboard.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }
    
    if (!creativeProject) {
        return (
             <div className="flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
                <Brush className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">
                    Moodboard não iniciado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Crie um moodboard para começar a organizar as ideias deste projeto.
                </p>
                <Button className="mt-6" onClick={handleCreateCreativeProject}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Moodboard
                </Button>
            </div>
        );
    }

    return (
        <CreativeProjectPageDetail
            project={creativeProject}
            initialItems={boardItems}
            onDataRefresh={fetchCreativeData}
        />
    );
}

export default function CreativeUnifiedPage() {
    return <CreativeProjectUnifiedPage />;
}
