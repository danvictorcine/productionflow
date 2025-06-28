"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Transaction } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        try {
            const storedProjects = localStorage.getItem('production_flow_projects');
            const storedTransactions = localStorage.getItem('production_flow_transactions');

            if (storedProjects) {
                const allProjects: Project[] = JSON.parse(storedProjects);
                const currentProject = allProjects.find(p => p.id === projectId);

                if (currentProject) {
                    setProject(currentProject);
                } else {
                    console.error("Project not found");
                    router.push('/'); // Redirect if project not found
                }
            } else {
                 router.push('/');
            }

            if (storedTransactions) {
                const allTransactions: Transaction[] = JSON.parse(storedTransactions).map((t: any) => ({...t, date: new Date(t.date)}));
                const projectTransactions = allTransactions.filter(t => t.projectId === projectId);
                setTransactions(projectTransactions);
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
            router.push('/');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, router]);

    const handleUpdateProject = (updatedProject: Project) => {
        setProject(updatedProject);
         try {
            const storedProjects = localStorage.getItem('production_flow_projects');
            if (storedProjects) {
                const allProjects: Project[] = JSON.parse(storedProjects);
                const updatedProjects = allProjects.map(p => p.id === updatedProject.id ? updatedProject : p);
                localStorage.setItem('production_flow_projects', JSON.stringify(updatedProjects));
            }
        } catch (error) {
            console.error("Failed to update project in localStorage", error);
        }
    }

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[125px] w-full" />
                    <Skeleton className="h-[125px] w-full" />
                    <Skeleton className="h-[125px] w-full" />
                </div>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-[350px]" />
                    <Skeleton className="lg:col-span-1 h-[350px]" />
                </div>
            </div>
        );
    }
    
    if (!project) {
        return <div>Projeto não encontrado. Redirecionando...</div>;
    }

    return <Dashboard project={project} initialTransactions={transactions} onProjectUpdate={handleUpdateProject} />;
}
