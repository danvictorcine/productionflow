// @/src/components/create-edit-shooting-day-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";

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
import { getLocationData } from "@/ai/flows/get-location-data-flow";
import { useToast } from "@/hooks/use-toast";

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});

const shootingDaySchema = z.object({
  date: z.date({ required_error: "A data da filmagem é obrigatória." }),
  location: z.string().min(1, "A localização é obrigatória."),
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
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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
      presentTeam: [],
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
          presentTeam: shootingDay.presentTeam || [],
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
          presentTeam: [],
        });
      }
    }
  }, [isOpen, isEditMode, shootingDay, form, productionTeam]);

  const handleSubmit = async (values: FormValues) => {
    setIsSaving(true);
    try {
      // Only fetch new coordinates if location has changed or it's a new entry
      const locationChanged = isEditMode ? shootingDay?.location !== values.location : true;
      let submissionData: any = { ...values };

      if (locationChanged && values.location) {
          const locationData = await getLocationData({ location: values.location });
          if (locationData?.coordinates) {
              submissionData.latitude = locationData.coordinates.lat;
              submissionData.longitude = locationData.coordinates.lon;
          } else {
            toast({ variant: "destructive", title: "Localização não encontrada", description: "Não foi possível encontrar as coordenadas para o local informado. Verifique o endereço e tente novamente."});
            setIsSaving(false);
            return;
          }
      } else if (isEditMode) {
          // Carry over existing coordinates if location hasn't changed
          submissionData.latitude = shootingDay?.latitude;
          submissionData.longitude = shootingDay?.longitude;
      }
      
      onSubmit(submissionData);

    } catch (error) {
        console.error("Error getting location data:", error);
        toast({ variant: "destructive", title: "Erro ao buscar dados da localização", description: "Houve um problema ao contatar o serviço de geolocalização. Verifique sua chave de API ou tente novamente mais tarde."});
    } finally {
        setIsSaving(false);
    }
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
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar Alterações" : "Criar Ordem do Dia"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
