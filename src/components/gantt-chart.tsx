// @/src/components/gantt-chart.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { GanttTask } from '@/lib/types';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import { GanttTaskForm } from './gantt-task-form';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from './ui/progress';
import { Resizable } from 're-resizable';
import { CopyableError } from './copyable-error';
import { cn } from '@/lib/utils';


interface GanttChartProps {
  projectId: string;
}

const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');

  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
        const today = new Date();
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
    const startDates = tasks.map(t => new Date(t.startDate));
    const endDates = tasks.map(t => new Date(t.endDate));
    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    return {
        start: startOfWeek(startOfMonth(minDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(maxDate), { weekStartsOn: 1 })
    };
  }, [tasks]);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTasks = await firestoreApi.getGanttTasks(projectId);
      fetchedTasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      setTasks(fetchedTasks);
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

  // Timeline rendering logic
  const days = eachDayOfInterval(dateRange);
  const months = eachMonthOfInterval(dateRange);
  const DAY_WIDTH = 35;
  const MONTH_WIDTH = 120;
  
  const totalWidth = viewMode === 'day' ? days.length * DAY_WIDTH : months.length * MONTH_WIDTH;


  const renderDayHeader = () => {
    const monthGroups = months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const daysInMonth = eachDayOfInterval({start: monthStart, end: monthEnd});
        return { month: monthStart, days: daysInMonth };
    });

    return (
        <div className="flex sticky top-0 z-10 bg-background">
            <div className="w-[300px] flex-shrink-0 border-r border-b p-2">
                <p className="font-semibold">Tarefas</p>
            </div>
            <div className="flex flex-1 border-b">
                 {monthGroups.map(({ month, days: monthDays }) => (
                    <div key={format(month, 'yyyy-MM')} style={{ width: `${monthDays.length * DAY_WIDTH}px`}}>
                        <div className="text-center font-semibold p-1 border-r border-b text-sm">
                            {format(month, 'MMMM yyyy', { locale: ptBR })}
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${monthDays.length}, ${DAY_WIDTH}px)` }}>
                            {monthDays.map(day => (
                                <div key={day.toISOString()} className="text-center border-r p-1 text-xs text-muted-foreground">
                                    <p>{format(day, 'dd')}</p>
                                    <p className="font-semibold">{format(day, 'EEEEE', { locale: ptBR })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


  const renderMonthHeader = () => (
      <div className="flex sticky top-0 z-10 bg-background">
          <div className="w-[300px] flex-shrink-0 border-r border-b p-2">
              <p className="font-semibold">Tarefas</p>
          </div>
          <div className="flex-1 grid border-b" style={{ gridTemplateColumns: `repeat(${months.length}, ${MONTH_WIDTH}px)` }}>
              {months.map(month => (
                  <div key={month.toISOString()} className="text-center border-r p-2 font-semibold text-sm">
                      {format(month, 'MMMM yyyy', { locale: ptBR })}
                  </div>
              ))}
          </div>
      </div>
  );

  const getTaskPositionAndWidth = (task: GanttTask) => {
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);

    if (viewMode === 'day') {
        const offsetDays = differenceInDays(startDate, dateRange.start);
        const durationDays = differenceInDays(endDate, startDate) + 1;
        return { left: offsetDays * DAY_WIDTH, width: durationDays * DAY_WIDTH };
    } else { // month view
        const startMonthIndex = differenceInMonths(startOfMonth(startDate), dateRange.start);
        const endMonthIndex = differenceInMonths(startOfMonth(endDate), dateRange.start);
        const durationMonths = (endMonthIndex - startMonthIndex) + 1;
        return { left: startMonthIndex * MONTH_WIDTH, width: durationMonths * MONTH_WIDTH };
    }
  };


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
           <div className="sticky top-0 z-10 p-2 bg-background/80 backdrop-blur-sm flex justify-end gap-2">
              <div className="mr-auto">
                <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')}>Dia</Button>
                <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>Mês</Button>
              </div>
              <Button onClick={openNewTaskForm} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
              </Button>
            </div>
            <div style={{ width: `${Math.max(1000, 300 + totalWidth)}px`}}>
                {viewMode === 'day' ? renderDayHeader() : renderMonthHeader()}
                
                {/* Body */}
                <div>
                   {phaseOrder.map(phase => (
                        groupedTasks[phase] && (
                            <div key={phase} className="group/phase">
                                <div className="flex h-[41px] items-center bg-muted/50 border-b">
                                    <div className="w-[300px] flex-shrink-0 border-r p-2">
                                        <p className="font-bold text-primary">{phase === 'Pre' ? 'Pré-Produção' : phase === 'Prod' ? 'Produção' : 'Pós-Produção'}</p>
                                    </div>
                                </div>
                                {groupedTasks[phase].map(task => {
                                    const { left, width } = getTaskPositionAndWidth(task);
                                    return (
                                        <div key={task.id} className="flex h-[50px] items-center">
                                            <div className="w-[300px] flex-shrink-0 border-r p-2 h-full flex items-center hover:bg-muted/30 cursor-pointer" onClick={() => openEditForm(task)}>
                                                <p className="text-sm font-medium truncate">{task.title}</p>
                                            </div>
                                            <div className="flex-1 relative h-full border-b">
                                                <div className="absolute top-1/2 -translate-y-1/2 h-8" style={{ left: `${left}px` }}>
                                                  <Resizable
                                                      size={{ width: `${width}px`, height: '32px' }}
                                                      minWidth={viewMode === 'day' ? DAY_WIDTH : MONTH_WIDTH}
                                                      enable={{ right: true }}
                                                      handleClasses={{ right: "absolute right-0 top-0 h-full w-2 cursor-ew-resize"}}
                                                      onResizeStop={(e, direction, ref, d) => {
                                                        if (viewMode === 'day') {
                                                            const newWidth = parseFloat(ref.style.width);
                                                            const newDuration = Math.round(newWidth / DAY_WIDTH);
                                                            const newEndDate = addDays(new Date(task.startDate), newDuration - 1);
                                                            handleResize(task.id, newEndDate);
                                                        }
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
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ))}
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
