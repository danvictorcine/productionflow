// @/src/components/create-edit-shooting-day-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import type { ShootingDay } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const shootingDaySchema = z.object({
  date: z.date({ required_error: "A data da filmagem é obrigatória." }),
  location: z.string().min(1, "A localização é obrigatória."),
  scenes: z.string().min(1, "A lista de cenas é obrigatória."),
  callTimes: z.string().min(1, "Os horários de chamada são obrigatórios."),
  equipment: z.string().optional(),
  costumes: z.string().optional(),
  props: z.string().optional(),
  generalNotes: z.string().optional(),
});

type FormValues = z.infer<typeof shootingDaySchema>;

interface CreateEditShootingDayDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => void;
  shootingDay?: ShootingDay;
}

export function CreateEditShootingDayDialog({ isOpen, setIsOpen, onSubmit, shootingDay }: CreateEditShootingDayDialogProps) {
  const isEditMode = !!shootingDay;

  const form = useForm<FormValues>({
    resolver: zodResolver(shootingDaySchema),
    defaultValues: {
      date: new Date(),
      location: "",
      scenes: "",
      callTimes: "",
      equipment: "",
      costumes: "",
      props: "",
      generalNotes: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && shootingDay) {
        form.reset({
          date: new Date(shootingDay.date),
          location: shootingDay.location,
          scenes: shootingDay.scenes,
          callTimes: shootingDay.callTimes,
          equipment: shootingDay.equipment,
          costumes: shootingDay.costumes,
          props: shootingDay.props,
          generalNotes: shootingDay.generalNotes,
        });
      } else {
        form.reset({
          date: new Date(),
          location: "",
          scenes: "",
          callTimes: "Chamada Geral - 08:00",
          equipment: "",
          costumes: "",
          props: "",
          generalNotes: "",
        });
      }
    }
  }, [isOpen, isEditMode, shootingDay, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Ordem do Dia" : "Criar Ordem do Dia"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize os detalhes do dia de filmagem." : "Preencha os detalhes para a Ordem do Dia."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data da Filmagem</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                              >
                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização Principal</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Estúdio A, Rua das Flores, 123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="callTimes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horários de Chamada</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Chamada Geral - 08:00&#10;Elenco - 08:30&#10;Direção - 07:30" {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scenes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lista de Cenas a Gravar</FormLabel>
                      <FormControl>
                        <Textarea placeholder="CENA 01 - EXT. PARQUE - DIA&#10;CENA 05 - INT. CAFÉ - DIA" {...field} rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipamentos Especiais</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Câmera RED com Lente 50mm, Kit de Luz, Drone..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="costumes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Figurino</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Personagem A - Roupa casual (vermelha), Personagem B - Terno..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="props"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetos de Cena (Props)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Mala de viagem, jornal antigo, xícara de café..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="generalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Previsão de chuva à tarde, estacionamento disponível..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t p-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Ordem do Dia"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
