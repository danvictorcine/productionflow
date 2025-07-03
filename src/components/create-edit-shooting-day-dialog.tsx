// @/src/components/create-edit-shooting-day-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import dynamic from 'next/dynamic';

import type { ShootingDay, TeamMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
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
import { Skeleton } from "./ui/skeleton";

const LocationPicker = dynamic(() => import('./location-picker').then(mod => mod.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});

const shootingDaySchema = z.object({
  date: z.date({ required_error: "A data da filmagem é obrigatória." }),
  location: z.string().min(1, "A localização é obrigatória. Clique no mapa ou pesquise."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  scenes: z.string().min(1, "A lista de cenas é obrigatória."),
  callTimes: z.string().min(1, "Os horários de chamada são obrigatórios."),
  equipment: z.string().optional(),
  costumes: z.string().optional(),
  props: z.string().optional(),
  generalNotes: z.string().optional(),
  presentTeam: z.array(teamMemberSchema).optional(),
});

type FormValues = z.infer<typeof shootingDaySchema>;

interface CreateEditShootingDayDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => void;
  shootingDay?: ShootingDay;
  productionTeam: TeamMember[];
}

export function CreateEditShootingDayDialog({ isOpen, setIsOpen, onSubmit, shootingDay, productionTeam }: CreateEditShootingDayDialogProps) {
  const isEditMode = !!shootingDay;
  const defaultPosition: [number, number] = [-14.235, -51.925]; // Brazil

  const form = useForm<FormValues>({
    resolver: zodResolver(shootingDaySchema),
    defaultValues: {
      date: new Date(),
      location: "",
      latitude: defaultPosition[0],
      longitude: defaultPosition[1],
      scenes: "",
      callTimes: "",
      equipment: "",
      costumes: "",
      props: "",
      generalNotes: "",
      presentTeam: [],
    },
  });
  
  const lat = form.watch('latitude');
  const lng = form.watch('longitude');

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && shootingDay) {
        form.reset({
          date: new Date(shootingDay.date),
          location: shootingDay.location,
          latitude: shootingDay.latitude || defaultPosition[0],
          longitude: shootingDay.longitude || defaultPosition[1],
          scenes: shootingDay.scenes,
          callTimes: shootingDay.callTimes,
          equipment: shootingDay.equipment,
          costumes: shootingDay.costumes,
          props: shootingDay.props,
          generalNotes: shootingDay.generalNotes,
          presentTeam: shootingDay.presentTeam || [],
        });
      } else {
        form.reset({
          date: new Date(),
          location: "",
          latitude: defaultPosition[0],
          longitude: defaultPosition[1],
          scenes: "",
          callTimes: "Chamada Geral - 08:00",
          equipment: "",
          costumes: "",
          props: "",
          generalNotes: "",
          presentTeam: [],
        });
      }
    }
  }, [isOpen, isEditMode, shootingDay, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };
  
  const handleLocationChange = (lat: number, lng: number, name: string) => {
    form.setValue('latitude', lat);
    form.setValue('longitude', lng);
    form.setValue('location', name, { shouldValidate: true });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Ordem do Dia" : "Criar Ordem do Dia"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize os detalhes do dia de filmagem." : "Preencha os detalhes para a Ordem do Dia."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="md:col-span-2">
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
                </div>
                
                <div className="space-y-4">
                   <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização</FormLabel>
                        <FormControl>
                          <Input readOnly placeholder="Selecione no mapa ou pesquise" {...field} />
                        </FormControl>
                         <FormDescription>
                          Use a busca ou clique no mapa para definir a localização.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <LocationPicker 
                      initialPosition={[lat || defaultPosition[0], lng || defaultPosition[1]]}
                      onLocationChange={handleLocationChange}
                  />
                </div>

                <div className="space-y-4">
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
                </div>

                <div className="md:col-span-2">
                   <FormField
                    control={form.control}
                    name="presentTeam"
                    render={() => (
                      <FormItem>
                        <FormLabel>Equipe Presente no Dia</FormLabel>
                        <FormDescription>Selecione quem da equipe principal estará presente nesta diária.</FormDescription>
                        <div className="space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
                          {productionTeam.length > 0 ? productionTeam.map((member) => (
                            <FormField
                              key={member.id}
                              control={form.control}
                              name="presentTeam"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.some(p => p.id === member.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), member])
                                          : field.onChange(field.value?.filter((p) => p.id !== member.id));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {member.name} <span className="text-muted-foreground">({member.role})</span>
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          )) : (
                            <p className="text-sm text-muted-foreground text-center">Nenhum membro da equipe cadastrado na produção.</p>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
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
                </div>
                 <div className="space-y-4">
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
