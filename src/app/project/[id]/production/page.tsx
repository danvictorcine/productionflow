// src/app/project/[id]/production/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Production, ShootingDay, UnifiedProject } from '@/lib/types';
import * as api from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { Skeleton } from '@/components/ui/skeleton';
import ProductionPageDetail from '@/components/production-page-detail';
import { Clapperboard, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ProductionProjectPageDetail() {
    const router = useRouter();
    const params = useParams();
    const unifiedProjectId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [unifiedProject, setUnifiedProject] = useState<UnifiedProject | null>(null);
    const [production, setProduction] = useState<Production | null>(null);
    const [shootingDays, setShootingDays] = useState<ShootingDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProductionData = useCallback(async () => {
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

            if (uProject.productionProjectId) {
                const productionData = await api.getProduction(uProject.productionProjectId);
                const shootingDaysData = await api.getShootingDays(uProject.productionProjectId);
                setProduction(productionData);
                setShootingDays(shootingDaysData);
            } else {
                setProduction(null);
                setShootingDays([]);
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados de produção',
                description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [unifiedProjectId, user, router, toast]);

    useEffect(() => {
        fetchProductionData();
    }, [fetchProductionData]);

    const handleCreateProductionProject = async () => {
        if (!unifiedProject) return;
        setIsLoading(true);
        try {
            const newProductionData = {
                name: unifiedProject.name,
                type: 'Produção',
                director: 'A definir',
                team: [],
                unifiedProjectId: unifiedProject.id,
            };
            const newProductionId = await api.addProduction(newProductionData);
            await api.updateUnifiedProject(unifiedProject.id, { productionProjectId: newProductionId });
            toast({ title: 'Módulo de Ordem do Dia Criado!' });
            await fetchProductionData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o módulo de Ordem do Dia.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        );
    }
    
    if (!production) {
        return (
             <div className="flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
                <Clapperboard className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">
                    Módulo de Ordem do Dia não iniciado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Crie uma produção para começar a gerenciar as Ordens do Dia.
                </p>
                <Button className="mt-6" onClick={handleCreateProductionProject}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Produção
                </Button>
            </div>
        );
    }

    return (
        <ProductionPageDetail
            production={production}
            shootingDays={shootingDays}
            onDataRefresh={fetchProductionData}
        />
    );
}


export default function ProductionProjectPage() {
    return <ProductionProjectPageDetail />;
}
