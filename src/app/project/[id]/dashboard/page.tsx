// @/src/app/project/[id]/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Users, Clapperboard, DollarSign, ArrowRight, GanttChartSquare } from 'lucide-react';

import type { Project, Production, ShootingDay, UnifiedProject, Talent, Transaction } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { CopyableError } from '@/components/copyable-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatCurrency, getInitials } from '@/lib/utils';
import Link from 'next/link';
import GanttChart from '@/components/gantt-chart';


interface DashboardData {
  team: Talent[];
  shootingDaysCount: number;
  budget: number | null;
  totalExpenses: number | null;
  financialProjectId?: string;
  productionProjectId?: string;
}

const DashboardCard = ({
  icon: Icon,
  title,
  children,
  footerLink,
  footerText
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  footerLink?: string;
  footerText?: string;
}) => (
  <Card className="flex flex-col">
    <CardHeader className="flex-row items-center gap-4 space-y-0">
      <div className="p-3 rounded-full bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      {children}
    </CardContent>
    {footerLink && footerText && (
       <CardFooter>
          <Button asChild variant="ghost" size="sm" className="-ml-4">
            <Link href={footerLink}>
              <ArrowRight className="mr-2 h-4 w-4" />
              {footerText}
            </Link>
          </Button>
       </CardFooter>
    )}
  </Card>
);


function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [project, setProject] = useState<UnifiedProject | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !projectId) return;

    try {
      const unifiedProject = await firestoreApi.getUnifiedProject(projectId);
      if (!unifiedProject) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
        router.push('/');
        return;
      }
      setProject(unifiedProject);

      let team: Talent[] = [];
      let shootingDaysCount = 0;
      let budget: number | null = null;
      let totalExpenses: number | null = null;

      if (unifiedProject.productionProjectId) {
        const production = await firestoreApi.getProduction(unifiedProject.productionProjectId);
        if (production?.team) {
            team = production.team as Talent[];
        }
        const days = await firestoreApi.getShootingDays(unifiedProject.productionProjectId);
        shootingDaysCount = days.length;
      }
      
      if (unifiedProject.financialProjectId) {
        const financialProject = await firestoreApi.getProject(unifiedProject.financialProjectId);
        if (financialProject) {
            budget = financialProject.budget;
            const transactions = await firestoreApi.getTransactions(financialProject.id);
            totalExpenses = transactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);

            // If production team is empty, try to get from financial project
            if (team.length === 0 && financialProject.talents) {
                team = financialProject.talents;
            }
        }
      }
      
      setData({ 
        team, 
        shootingDaysCount, 
        budget, 
        totalExpenses,
        financialProjectId: unifiedProject.financialProjectId,
        productionProjectId: unifiedProject.productionProjectId,
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dashboard',
        description: <CopyableError userMessage="Não foi possível buscar os dados do projeto." errorCode={(error as Error).message} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId, toast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-8 w-1/2 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project || !data) {
    return <div>Não foi possível carregar os dados do dashboard.</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard do Projeto</h2>
        <p className="text-muted-foreground">{project.name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <DashboardCard 
            icon={Users} 
            title="Equipe"
            footerLink={`/project/${projectId}/production`}
            footerText="Gerenciar equipe"
        >
          {data.team.length > 0 ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold">{data.team.length} pessoas</p>
              <div className="space-y-2">
                {data.team.slice(0, 6).map(member => (
                   <div key={member.id} className="flex items-center gap-2">
                       <Avatar className="h-6 w-6">
                           <AvatarImage src={member.photoURL} alt={member.name} />
                           <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                       </Avatar>
                       <span className="text-sm font-medium">{member.name} - <span className="text-muted-foreground">{member.role}</span></span>
                   </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">Nenhuma pessoa cadastrada</div>
          )}
        </DashboardCard>

        <DashboardCard 
            icon={Clapperboard} 
            title="Diárias"
            footerLink={`/project/${projectId}/production`}
            footerText="Ver ordens do dia"
        >
           {data.productionProjectId ? (
             <div className="space-y-2">
                <p className="text-2xl font-bold">{data.shootingDaysCount} diárias</p>
                <p className="text-sm text-muted-foreground">Baseado nas ordens do dia criadas.</p>
             </div>
           ) : (
             <div className="text-center text-muted-foreground py-4">Nenhuma ordem do dia criada</div>
           )}
        </DashboardCard>

        <DashboardCard 
            icon={DollarSign} 
            title="Orçamento"
            footerLink={`/project/${projectId}/financial`}
            footerText="Ver detalhes financeiros"
        >
          {data.financialProjectId && data.budget !== null && data.totalExpenses !== null ? (
            <div className="space-y-2">
                <p className="text-2xl font-bold">{formatCurrency(data.budget)}</p>
                <p className="text-sm text-muted-foreground">Despesas até agora: <span className="font-semibold text-foreground">{formatCurrency(data.totalExpenses)}</span></p>
            </div>
          ) : (
             <div className="text-center text-muted-foreground py-4">Nenhum orçamento criado</div>
          )}
        </DashboardCard>
      </div>

       <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <GanttChartSquare className="h-5 w-5 text-muted-foreground" />
                  Cronograma do Projeto
              </CardTitle>
              <CardDescription>
                  Visualize e gerencie as fases e tarefas do seu projeto.
              </CardDescription>
          </CardHeader>
          <CardContent>
              <GanttChart projectId={projectId} />
          </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
    return <ProjectDashboardPage />;
}
