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
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, differenceInMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Resizable } from 're-resizable';
import { CopyableError } from './copyable-error';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface GanttChartProps {
  projectId: string;
}

// Function to parse date strings in UTC to avoid timezone issues
const parseDateInUTC = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};


const GanttChart: React.FC<GanttChartProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');

  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; content: string } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);


  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
        const today = new Date();
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
    
    const startDates = tasks.map(t => parseDateInUTC(t.startDate));
    const endDates = tasks.map(t => parseDateInUTC(t.endDate));

    const minDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    return {
        start: startOfMonth(minDate),
        end: endOfMonth(maxDate)
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

  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const months = eachMonthOfInterval(dateRange);
  const DAY_WIDTH = 35;
  const MONTH_WIDTH = 120;
  
  const totalWidth = viewMode === 'day' ? days.length * DAY_WIDTH : months.length * MONTH_WIDTH;

  const renderTimelineHeader = () => {
     if (viewMode === 'day') {
        const monthGroups = months.map(monthStart => {
            const monthEnd = endOfMonth(monthStart);
            const daysInMonth = eachDayOfInterval({start: monthStart, end: monthEnd});
            return { month: monthStart, days: daysInMonth };
        });

        return (
            <div className="flex sticky top-0 z-10 bg-background border-b">
                 {monthGroups.map(({ month, days: monthDays }) => (
                    <div key={format(month, 'yyyy-MM')} style={{ width: `${monthDays.length * DAY_WIDTH}px`}} className="flex-shrink-0">
                        <div className="text-center font-semibold p-1 border-r text-sm">
                            {format(month, 'MMMM yyyy', { locale: ptBR })}
                        </div>
                        <div className="flex">
                            {monthDays.map(day => (
                                <div key={day.toISOString()} className="text-center border-r p-1 text-xs text-muted-foreground" style={{ width: `${DAY_WIDTH}px` }}>
                                    <p>{format(day, 'dd')}</p>
                                    <p className="font-semibold">{format(day, 'EEEEE', { locale: ptBR })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    // Month View
    return (
      <div className="flex sticky top-0 z-10 bg-background border-b h-[69px]">
        {months.map(month => (
          <div key={month.toISOString()} className="flex-shrink-0 text-center border-r p-2 font-semibold text-sm flex items-center justify-center" style={{ width: `${MONTH_WIDTH}px` }}>
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </div>
        ))}
      </div>
    );
  };

  const getTaskPositionAndWidth = (task: GanttTask) => {
    const startDate = parseDateInUTC(task.startDate);
    const endDate = parseDateInUTC(task.endDate);

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
  
  const phaseOrder: GanttTask['phase'][] = ['Desenvolvimento', 'Pre', 'Prod', 'Post', 'Distribuição'];

  const phaseLabels: Record<GanttTask['phase'], string> = {
    Desenvolvimento: 'Desenvolvimento',
    Pre: 'Pré-Produção',
    Prod: 'Produção',
    Post: 'Pós-Produção',
    Distribuição: 'Distribuição',
  };


  return (
    <div className="w-full relative" ref={containerRef}>
         {tooltipData && (
            <div
            className="absolute z-30 p-2 text-xs bg-popover text-popover-foreground rounded-md shadow-lg pointer-events-none"
            style={{ top: tooltipData.y, left: tooltipData.x, transform: 'translate(10px, 10px)' }}
            >
            {tooltipData.content}
            </div>
        )}
        {tasks.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-sm text-muted-foreground">Nenhuma tarefa no cronograma. Clique em ‘+ Tarefa’ para começar.</p>
            <Button onClick={openNewTaskForm} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
              </Button>
          </div>
        ) : (
          <Card>
            <div className="p-2 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')}>Dia</Button>
                  <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>Mês</Button>
                </div>
                <Button onClick={openNewTaskForm} size="sm" variant="ghost">
                  <PlusCircle className="mr-2 h-4 w-4" /> Nova Tarefa
                </Button>
              </div>
            <div className="flex">
              {/* Task List Column (Fixed) */}
              <div className="w-[150px] md:w-[300px] flex-shrink-0 border-r">
                  <div className="h-[69px] border-b p-2 flex items-center sticky top-0 bg-background z-10">
                    <p className="font-semibold">Tarefas</p>
                  </div>
                  {phaseOrder.map(phase => (
                    groupedTasks[phase] && (
                      <div key={phase}>
                        <div className="flex items-center h-10 border-b bg-muted/50 p-2">
                          <p className="font-bold text-foreground">{phaseLabels[phase]}</p>
                        </div>
                        {groupedTasks[phase].map(task => (
                          <div key={task.id} className="flex h-[50px] items-center border-b p-2 hover:bg-muted/30 cursor-pointer" onClick={() => openEditForm(task)}>
                            <p className="text-sm font-medium truncate">{task.title}</p>
                          </div>
                        ))}
                      </div>
                    )
                  ))}
              </div>

              {/* Timeline Column (Scrollable) */}
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
                  {renderTimelineHeader()}
                  <div className="relative">
                      {phaseOrder.map(phase => (
                        <React.Fragment key={`${phase}-timeline`}>
                            <div className="h-10 border-b bg-muted/50"></div>
                            {groupedTasks[phase] && groupedTasks[phase].map(task => {
                                const { left, width } = getTaskPositionAndWidth(task);
                                const solidColor = task.color ? task.color : 'bg-primary';

                                let bgColorRgb;
                                switch (solidColor) {
                                    case 'bg-blue-500': bgColorRgb = '59, 130, 246'; break;
                                    case 'bg-green-500': bgColorRgb = '34, 197, 94'; break;
                                    case 'bg-yellow-500': bgColorRgb = '234, 179, 8'; break;
                                    case 'bg-orange-500': bgColorRgb = '249, 115, 22'; break;
                                    case 'bg-red-500': bgColorRgb = '239, 68, 68'; break;
                                    case 'bg-purple-500': bgColorRgb = '139, 92, 246'; break;
                                    default: bgColorRgb = '99, 102, 241'; break; // primary fallback
                                }

                                return (
                                    <div key={task.id} className="relative h-[50px] border-b">
                                          <div 
                                            className="absolute top-1/2 -translate-y-1/2 h-8 gantt-task-bar" 
                                            style={{ left: `${left}px` }}
                                            onMouseMove={(e) => {
                                                if (containerRef.current) {
                                                    const rect = containerRef.current.getBoundingClientRect();
                                                    setTooltipData({ x: e.clientX - rect.left, y: e.clientY - rect.top, content: `[${task.progress}%] ${task.title}` });
                                                }
                                            }}
                                            onMouseLeave={() => setTooltipData(null)}
                                          >
                                            <Resizable
                                                size={{ width: `${width}px`, height: '32px' }}
                                                minWidth={viewMode === 'day' ? DAY_WIDTH : MONTH_WIDTH}
                                                enable={{ right: true }}
                                                handleClasses={{ right: "absolute right-0 top-0 h-full w-2 cursor-ew-resize"}}
                                                onResizeStop={(e, direction, ref, d) => {
                                                  if (viewMode === 'day') {
                                                      const newWidth = parseFloat(ref.style.width);
                                                      const newDuration = Math.round(newWidth / DAY_WIDTH);
                                                      const newEndDate = addDays(parseDateInUTC(task.startDate), newDuration - 1);
                                                      handleResize(task.id, newEndDate);
                                                  }
                                                }}
                                                className="relative"
                                            >
                                              <div 
                                                  className="absolute inset-0 rounded-md overflow-hidden"
                                                  style={{ backgroundColor: `rgba(${bgColorRgb}, 0.2)` }}
                                              >
                                                  <div 
                                                      className="h-full rounded-md"
                                                      style={{ width: `${task.progress}%`, backgroundColor: `rgb(${bgColorRgb})` }}
                                                  ></div>
                                              </div>
                                            </Resizable>
                                          </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                  </div>
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
