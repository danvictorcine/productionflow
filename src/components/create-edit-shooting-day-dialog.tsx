// @/src/components/create-edit-shooting-day-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
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
import { Separator } from "./ui/separator";

const LocationPicker = dynamic(() => import('./location-picker').then(mod => mod.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
});

const hospitalSchema = z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
});

const callTimeSchema = z.object({
    id: z.string(),
    department: z.string().min(1, "Departamento é obrigatório."),
    time: z.string().min(1, "Horário é obrigatório."),
});

const sceneSchema = z.object({
    id: z.string(),
    sceneNumber: z.string().min(1, "Nº da cena é obrigatório."),
    title: z.string().min(1, "Título é obrigatório."),
    description: z.string().min(1, "Descrição é obrigatória."),
    pages: z.string().min(1, "Nº de páginas é obrigatório."),
    presentInScene: z.array(teamMemberSchema),
});

const shootingDaySchema = z.object({
  date: z.date({ required_error: "A data da filmagem é obrigatória." }),
  dayNumber: z.coerce.number().optional(),
  totalDays: z.coerce.number().optional(),
  location: z.string().min(1, "A localização é obrigatória. Clique no mapa ou pesquise."),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  callTimes: z.array(callTimeSchema),
  scenes: z.array(sceneSchema),
  presentTeam: z.array(teamMemberSchema).optional(),
  // Logistics
  mealTime: z.string().optional(),
  parkingInfo: z.string().optional(),
  radioChannels: z.string().optional(),
  nearestHospital: hospitalSchema.optional(),
  // Department notes
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
      scenes: [],
      callTimes: [],
      equipment: "",
      costumes: "",
      props: "",
      generalNotes: "",
      presentTeam: [],
      dayNumber: undefined,
      totalDays: undefined,
      mealTime: "",
      parkingInfo: "",
      radioChannels: "",
      nearestHospital: { name: "", address: "", phone: "" },
    },
  });
  
  const lat = form.watch('latitude');
  const lng = form.watch('longitude');

  const { fields: callTimeFields, append: appendCallTime, remove: removeCallTime } = useFieldArray({
    control: form.control,
    name: "callTimes",
  });

  const { fields: sceneFields, append: appendScene, remove: removeScene } = useFieldArray({
    control: form.control,
    name: "scenes",
  });


  useEffect(() => {
    if (isOpen) {
      if (isEditMode && shootingDay) {
        form.reset({
          date: new Date(shootingDay.date),
          dayNumber: shootingDay.dayNumber,
          totalDays: shootingDay.totalDays,
          location: shootingDay.location,
          latitude: shootingDay.latitude || defaultPosition[0],
          longitude: shootingDay.longitude || defaultPosition[1],
          callTimes: Array.isArray(shootingDay.callTimes) ? shootingDay.callTimes : [],
          scenes: Array.isArray(shootingDay.scenes) ? shootingDay.scenes : [],
          mealTime: shootingDay.mealTime || "",
          parkingInfo: shootingDay.parkingInfo || "",
          radioChannels: shootingDay.radioChannels || "",
          nearestHospital: shootingDay.nearestHospital || { name: "", address: "", phone: "" },
          presentTeam: shootingDay.presentTeam || [],
          equipment: shootingDay.equipment,
          costumes: shootingDay.costumes,
          props: shootingDay.props,
          generalNotes: shootingDay.generalNotes,
        });
      } else {
        form.reset({
            date: new Date(),
            location: "",
            latitude: defaultPosition[0],
            longitude: defaultPosition[1],
            scenes: [],
            callTimes: [{ id: crypto.randomUUID(), department: "Chamada Geral", time: "08:00" }],
            equipment: "",
            costumes: "",
            props: "",
            generalNotes: "",
            presentTeam: [],
            dayNumber: undefined,
            totalDays: undefined,
            mealTime: "12:00 - 13:00",
            parkingInfo: "",
            radioChannels: "Canal 1 - Produção | Canal 2 - Direção",
            nearestHospital: { name: "", address: "", phone: "" },
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
                <div className="space-y-6">
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Informações Gerais</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg">
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
                            <FormField control={form.control} name="dayNumber" render={({ field }) => (
                                <FormItem><FormLabel>Diária Nº</FormLabel><FormControl><Input type="number" placeholder="Ex: 1" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="totalDays" render={({ field }) => (
                                <FormItem><FormLabel>Total de Diárias</FormLabel><FormControl><Input type="number" placeholder="Ex: 10" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Localização e Logística</h3>
                        <div className="border p-4 rounded-lg space-y-4">
                            <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Localização</FormLabel>
                                    <FormControl><Input readOnly placeholder="Selecione no mapa ou pesquise" {...field} /></FormControl>
                                    <FormDescription>Use a busca ou clique no mapa para definir a localização.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <LocationPicker initialPosition={[lat || defaultPosition[0], lng || defaultPosition[1]]} onLocationChange={handleLocationChange} />
                            <FormField control={form.control} name="parkingInfo" render={({ field }) => (
                                <FormItem><FormLabel>Informações de Estacionamento</FormLabel><FormControl><Textarea placeholder="Ex: Estacionamento disponível na rua lateral..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="mealTime" render={({ field }) => (
                                    <FormItem><FormLabel>Horário de Refeições</FormLabel><FormControl><Input placeholder="Ex: 12:00 - 13:00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="radioChannels" render={({ field }) => (
                                    <FormItem><FormLabel>Canais de Rádio</FormLabel><FormControl><Input placeholder="Ex: Canal 1 - Geral, Canal 2 - Direção" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Informações de Segurança</h3>
                        <div className="border p-4 rounded-lg">
                            <FormLabel>Hospital Mais Próximo</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                <FormField control={form.control} name="nearestHospital.name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Nome</FormLabel><FormControl><Input placeholder="Nome do hospital" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="nearestHospital.address" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Endereço</FormLabel><FormControl><Input placeholder="Endereço completo" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="nearestHospital.phone" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Telefone</FormLabel><FormControl><Input placeholder="(XX) XXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Horários de Chamada</h3>
                        <div className="space-y-2">
                            {callTimeFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end p-2 border rounded-lg">
                                    <FormField control={form.control} name={`callTimes.${index}.department`} render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs">Departamento/Pessoa</FormLabel><FormControl><Input placeholder="Ex: Elenco Principal" {...field}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`callTimes.${index}.time`} render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs">Horário</FormLabel><FormControl><Input placeholder="Ex: 07:30" {...field}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCallTime(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendCallTime({id: crypto.randomUUID(), department: "", time: ""})}>
                                <PlusCircle className="mr-2 h-4 w-4"/>Adicionar Chamada
                            </Button>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                         <h3 className="text-lg font-semibold mb-2">Cenas a Gravar</h3>
                         <div className="space-y-4">
                            {sceneFields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="grid grid-cols-[100px_1fr_120px] gap-2 items-end flex-1">
                                            <FormField control={form.control} name={`scenes.${index}.sceneNumber`} render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Cena Nº</FormLabel><FormControl><Input placeholder="Ex: 01A" {...field}/></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`scenes.${index}.title`} render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Título/Local</FormLabel><FormControl><Input placeholder="Ex: EXT. PARQUE - DIA" {...field}/></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`scenes.${index}.pages`} render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs">Páginas</FormLabel><FormControl><Input placeholder="Ex: 1 3/8" {...field}/></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeScene(index)} className="ml-2"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                    <FormField control={form.control} name={`scenes.${index}.description`} render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs">Descrição da Ação</FormLabel><FormControl><Textarea placeholder="Breve descrição do que acontece na cena." {...field} rows={2}/></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField
                                        control={form.control}
                                        name={`scenes.${index}.presentInScene`}
                                        render={() => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Elenco/Equipe na Cena</FormLabel>
                                            <div className="space-y-2 rounded-md border p-4 max-h-32 overflow-y-auto grid grid-cols-2 md:grid-cols-3">
                                            {productionTeam.map((member) => (
                                                <FormField
                                                    key={member.id}
                                                    control={form.control}
                                                    name={`scenes.${index}.presentInScene`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
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
                                                            <FormLabel className="font-normal text-sm">{member.name}</FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendScene({id: crypto.randomUUID(), sceneNumber: "", title: "", description: "", pages: "", presentInScene: []})}>
                                <PlusCircle className="mr-2 h-4 w-4"/>Adicionar Cena
                            </Button>
                         </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Notas dos Departamentos</h3>
                         <div className="border p-4 rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="equipment" render={({ field }) => (<FormItem><FormLabel>Equipamentos</FormLabel><FormControl><Textarea placeholder="Notas do departamento de Câmera/Elétrica..." {...field} /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="costumes" render={({ field }) => (<FormItem><FormLabel>Figurino</FormLabel><FormControl><Textarea placeholder="Notas do departamento de Figurino..." {...field} /></FormControl></FormItem>)}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="props" render={({ field }) => (<FormItem><FormLabel>Objetos de Cena e Direção de Arte</FormLabel><FormControl><Textarea placeholder="Notas do departamento de Arte..." {...field} /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name="generalNotes" render={({ field }) => (<FormItem><FormLabel>Observações Gerais</FormLabel><FormControl><Textarea placeholder="Outras notas e observações importantes..." {...field} /></FormControl></FormItem>)}/>
                            </div>
                         </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Equipe Presente na Diária</h3>
                         <FormField
                            control={form.control}
                            name="presentTeam"
                            render={() => (
                            <FormItem>
                                <FormDescription>Selecione quem da equipe principal estará presente nesta diária (para fins de organização geral).</FormDescription>
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
