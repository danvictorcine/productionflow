'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brush, Edit, Construction } from 'lucide-react';

import type { CreativeProject } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import AuthGuard from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { AppFooter } from '@/components/app-footer';
import { CreateEditCreativeProjectDialog } from '@/components/create-edit-creative-project-dialog';

function CreativeProjectPageDetail() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<CreativeProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchProjectData = async () => {
    if (!projectId || !user) return;
    setIsLoading(true);
    try {
      const projData = await firestoreApi.getCreativeProject(projectId);
      if (projData) {
        setProject(projData);
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
        router.push('/');
      }
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar projeto',
        description: <CopyableError userMessage="Não foi possível carregar os dados do projeto." errorCode={errorTyped.code || errorTyped.message} />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId, user]);
  
  const handleProjectSubmit = async (data: Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>) => {
    if (!project) return;
    try {
      await firestoreApi.updateCreativeProject(project.id, data);
      await fetchProjectData();
      setIsEditDialogOpen(false);
      toast({ title: 'Projeto atualizado com sucesso!' });
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: <CopyableError userMessage="Não foi possível atualizar o projeto." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
  };

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
    return null; // or a not-found component
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-muted/40">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar para Projetos">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Brush className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-xl font-bold text-primary truncate">{project.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setIsEditDialogOpen(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Editar Projeto
          </Button>
          <UserNav />
        </div>
      </header>
      
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="p-4 mb-6 border-b">
            <p className="text-muted-foreground">{project.description}</p>
        </div>

        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 min-h-[500px] bg-background">
          <Construction className="mx-auto h-16 w-16 text-primary/50" />
          <h3 className="mt-6 text-2xl font-semibold">Moodboard em Construção</h3>
          <p className="mt-2 text-md text-muted-foreground max-w-md">
            Este espaço em breve se tornará uma tela interativa para você organizar suas ideias, imagens e vídeos.
          </p>
        </div>
      </main>
      
      <AppFooter />
      
      <CreateEditCreativeProjectDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        onSubmit={handleProjectSubmit}
        project={project}
      />
    </div>
  );
}

export default function CreativeProjectPage() {
  return (
    <AuthGuard>
      <CreativeProjectPageDetail />
    </AuthGuard>
  );
}
