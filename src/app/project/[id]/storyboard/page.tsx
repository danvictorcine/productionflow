// src/app/project/[id]/storyboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Storyboard, StoryboardScene, StoryboardPanel, UnifiedProject } from '@/lib/types';
import * as api from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { Skeleton } from '@/components/ui/skeleton';
import StoryboardPageDetail from '@/components/storyboard-page-detail';
import { Image as ImageIcon, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function StoryboardProjectUnifiedPage() {
    const router = useRouter();
    const params = useParams();
    const unifiedProjectId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [unifiedProject, setUnifiedProject] = useState<UnifiedProject | null>(null);
    const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStoryboardData = useCallback(async () => {
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

            if (uProject.storyboardProjectId) {
                const storyboardData = await api.getStoryboard(uProject.storyboardProjectId);
                setStoryboard(storyboardData);
            } else {
                setStoryboard(null);
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar storyboard',
                description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [unifiedProjectId, user, router, toast]);

    useEffect(() => {
        fetchStoryboardData();
    }, [fetchStoryboardData]);

    const handleCreateStoryboardProject = async () => {
        if (!unifiedProject) return;
        setIsLoading(true);
        try {
            const newStoryboardData = {
                name: unifiedProject.name,
                description: unifiedProject.description,
                aspectRatio: '16:9' as const,
                unifiedProjectId: unifiedProject.id,
            };
            const newStoryboardId = await api.addStoryboard(newStoryboardData);
            await api.updateUnifiedProject(unifiedProject.id, { storyboardProjectId: newStoryboardId });
            toast({ title: 'Storyboard Criado!' });
            await fetchStoryboardData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o storyboard.' });
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
    
    if (!storyboard) {
        return (
             <div className="flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
                <ImageIcon className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">
                    Storyboard não iniciado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Crie um storyboard para começar a planejar as cenas deste projeto.
                </p>
                <Button className="mt-6" onClick={handleCreateStoryboardProject}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Storyboard
                </Button>
            </div>
        );
    }

    return (
        <StoryboardPageDetail
            storyboard={storyboard}
            onDataRefresh={fetchStoryboardData}
        />
    );
}

export default function StoryboardUnifiedPage() {
    return <StoryboardProjectUnifiedPage />;
}
