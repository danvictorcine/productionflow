// @/components/gantt-task-form.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";

import type { GanttTask } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Slider } from "./ui/slider";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const formSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
  phase: z.enum(['Pre', 'Prod', 'Post'], { required_error: "A fase é obrigatória." }),
  startDate: z.date({ required_error: "A data de início é obrigatória." }),
  endDate: z.date({ required_error: "A data de término é obrigatória." }),
  progress: z.number().min(0).max(100),
  notes: z.string().optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "A data de término não pode ser anterior à data de início.",
  path: ["endDate"],
});

type FormValues = z.infer<typeof formSchema>;

interface GanttTaskFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<GanttTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  onDelete: (taskId: string) => void;
  task?: GanttTask | null;
}

export function GanttTaskForm({ isOpen, setIsOpen, onSubmit, onDelete, task }: GanttTaskFormProps) {
  const isEditMode = !!task;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      phase: "Pre",
      startDate: new Date(),
      endDate: new Date(),
      progress: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            title: task.title,
            phase: task.phase,
            startDate: new Date(task.startDate),
            endDate: new Date(task.endDate),
            progress: task.progress,
            notes: task.notes || "",
          }
        : {
            title: "",
            phase: 'Pre' as const,
            startDate: new Date(),
            endDate: new Date(),
            progress: 0,
            notes: "",
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, task, form]);

  const handleSubmit = (values: FormValues) => {
    const dataToSubmit = {
      ...values,
      startDate: format(values.startDate, 'yyyy-MM-dd'),
      endDate: format(values.endDate, 'yyyy-MM-dd'),
    };
    onSubmit(dataToSubmit);
  };
  
  const handleDelete = () => {
    if(task) {
      onDelete(task.id);
      setIsOpen(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Tarefa" : "Nova Tarefa do Cronograma"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes da tarefa." : "Preencha as informações para adicionar uma nova tarefa ao cronograma."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título da Tarefa</FormLabel>
                <FormControl><Input placeholder="ex: Contratar equipe principal" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="phase" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fase</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione a fase" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Pre">Pré-Produção</SelectItem>
                            <SelectItem value="Prod">Produção</SelectItem>
                            <SelectItem value="Post">Pós-Produção</SelectItem>
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
               <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Término</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP", { locale: ptBR })) : (<span>Escolha uma data</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="progress" render={({ field }) => (
                <FormItem>
                    <FormLabel>Progresso ({field.value}%)</FormLabel>
                    <FormControl>
                        <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                        />
                    </FormControl>
                </FormItem>
             )}/>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Anotações (Opcional)</FormLabel>
                <FormControl><Textarea placeholder="Detalhes importantes, links, ou responsáveis." {...field} rows={3} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <SheetFooter className="pt-4">
              {isEditMode && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" className="mr-auto"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja excluir a tarefa "{task.title}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Tarefa"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
