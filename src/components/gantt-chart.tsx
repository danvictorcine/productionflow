// @/src/components/gantt-chart.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { GanttTask } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import { GanttTaskForm } from './gantt-task-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from './ui/progress';
import { Resizable } from 're-resizable';
import { CopyableError } from './copyable-error';

interface GanttChartProps {
  projectId: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const { toast } = useToast();
  
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTasks = await firestoreApi.getGanttTasks(projectId);
      // Ordenação agora feita no cliente
      fetchedTasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setTasks(fetchedTasks);

      if (fetchedTasks.length > 0) {
        const startDates = fetchedTasks.map(t => new Date(t.startDate));
        const endDates = fetchedTasks.map(t => new Date(t.endDate));
        const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
        setDateRange({ start: startOfMonth(minDate), end: endOfMonth(maxDate) });
      } else {
         setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) });
      }

    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar tarefas',
        description: (
          <CopyableError
            userMessage="Não foi possível carregar o cronograma."
            errorCode={errorTyped.code || errorTyped.message}
          />
        ),
      });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFormSubmit = async (taskData: Omit<GanttTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingTask) {
        await firestoreApi.updateGanttTask(projectId, editingTask.id, taskData);
        toast({ title: 'Tarefa atualizada!' });
      } else {
        await firestoreApi.addGanttTask(projectId, taskData);
        toast({ title: 'Tarefa adicionada!' });
      }
      fetchData();
    } catch (error) {
      const errorTyped = error as { code?: string; message: string };
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Tarefa',
        description: <CopyableError userMessage="Não foi possível salvar a tarefa no cronograma." errorCode={errorTyped.code || errorTyped.message} />,
      });
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };
  
  const debouncedUpdateTask = useDebouncedCallback(async (taskId: string, data: Partial<GanttTask>) => {
    try {
      await firestoreApi.updateGanttTask(projectId, taskId, data);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa.' });
      fetchData(); // Re-fetch to revert optimistic update
    }
  }, 200);

  const handleResize = (taskId: string, newEndDate: Date) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, endDate: format(newEndDate, 'yyyy-MM-dd') } : t));
    debouncedUpdateTask(taskId, { endDate: format(newEndDate, 'yyyy-MM-dd') });
  };
  
  const handleDeleteTask = async (taskId: string) => {
      try {
        await firestoreApi.deleteGanttTask(projectId, taskId);
        toast({ title: "Tarefa excluída."});
        fetchData();
      } catch (error) {
        toast({ variant: 'destructive', title: "Erro ao excluir tarefa." });
      }
  }
  
  const openEditForm = (task: GanttTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };
  
  const openNewTaskForm = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const days = eachDayOfInterval(dateRange);
  const CELL_WIDTH = 40; // width of a day cell in pixels

  if (isLoading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const groupedTasks = tasks.reduce((acc, task) => {
    (acc[task.phase] = acc[task.phase] || []).push(task);
    return acc;
  }, {} as Record<GanttTask['phase'], GanttTask[]>);
  
  const phaseOrder: GanttTask['phase'][] = ['Pre', 'Prod', 'Post'];

  return (
    <div className="w-full">
      {tasks.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-sm text-muted-foreground">Nenhuma tarefa no cronograma. Clique em ‘+ Tarefa’ para começar.</p>
          <Button onClick={openNewTaskForm} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      ) : (
        <Card className="overflow-x-auto relative">
           <div className="sticky top-0 z-10 p-2 bg-background/80 backdrop-blur-sm flex justify-end">
              <Button onClick={openNewTaskForm} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
              </Button>
            </div>
            <div className="p-4" style={{ width: `${Math.max(1000, 300 + days.length * CELL_WIDTH)}px`}}>
                {/* Header */}
                <div className="flex sticky top-0 z-10 bg-background">
                    <div className="w-[300px] flex-shrink-0 border-r border-b p-2">
                        <p className="font-semibold">Tarefas</p>
                    </div>
                    <div className="flex-1 grid grid-cols-1 border-b">
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, ${CELL_WIDTH}px)` }}>
                            {days.map(day => (
                                <div key={day.toISOString()} className="text-center border-r p-1 text-xs text-muted-foreground">
                                    <p>{format(day, 'dd')}</p>
                                    <p className="font-semibold">{format(day, 'EEE', { locale: ptBR })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex">
                    <div className="w-[300px] flex-shrink-0 border-r"> {/* Task Names Column */}
                        {phaseOrder.map(phase => (
                            groupedTasks[phase] && (
                                <div key={phase}>
                                    <p className="font-bold text-primary p-2 bg-muted/50">{phase === 'Pre' ? 'Pré-Produção' : phase === 'Prod' ? 'Produção' : 'Pós-Produção'}</p>
                                    {groupedTasks[phase].map(task => (
                                        <div key={task.id} className="h-[60px] flex items-center p-2 border-b hover:bg-muted/30 cursor-pointer" onClick={() => openEditForm(task)}>
                                            <p className="text-sm font-medium truncate">{task.title}</p>
                                        </div>
                                    ))}
                                </div>
                            )
                        ))}
                    </div>

                    <div className="flex-1 relative"> {/* Timeline Column */}
                       {phaseOrder.map(phase => (
                            groupedTasks[phase] && (
                                <div key={phase}>
                                    <div className="h-[41px] bg-muted/50 border-b"></div> {/* Phase Header Placeholder */}
                                    {groupedTasks[phase].map(task => {
                                        const startDate = new Date(task.startDate);
                                        const endDate = new Date(task.endDate);
                                        const offsetDays = differenceInDays(startDate, dateRange.start);
                                        const durationDays = differenceInDays(endDate, startDate) + 1;
                                        
                                        const left = offsetDays * CELL_WIDTH;
                                        const width = durationDays * CELL_WIDTH;
                                        
                                        return (
                                            <div key={task.id} className="h-[60px] relative border-b">
                                               <div className="absolute top-1/2 -translate-y-1/2 h-8" style={{ left: `${left}px` }}>
                                                  <Resizable
                                                      size={{ width: `${width}px`, height: '32px' }}
                                                      minWidth={CELL_WIDTH}
                                                      enable={{ right: true }}
                                                      onResizeStop={(e, direction, ref, d) => {
                                                          const newWidth = parseFloat(ref.style.width);
                                                          const newDuration = Math.round(newWidth / CELL_WIDTH);
                                                          const newEndDate = addDays(startDate, newDuration - 1);
                                                          handleResize(task.id, newEndDate);
                                                      }}
                                                      className="relative"
                                                  >
                                                      <div className="absolute inset-0 bg-primary/20 border border-primary rounded-md flex items-center justify-between px-2 overflow-hidden">
                                                          <p className="text-xs font-semibold text-primary-foreground truncate">{task.title}</p>
                                                      </div>
                                                      <Progress value={task.progress} className="absolute bottom-0 left-0 h-1 w-full" />
                                                  </Resizable>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
      </Card>
      )}

      {isFormOpen && (
        <GanttTaskForm
            isOpen={isFormOpen}
            setIsOpen={setIsFormOpen}
            onSubmit={handleFormSubmit}
            onDelete={handleDeleteTask}
            task={editingTask}
        />
      )}
    </div>
  );
};

export default GanttChart;
