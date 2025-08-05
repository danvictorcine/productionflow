// @/src/components/create-edit-shooting-day-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import dynamic from 'next/dynamic';

import type { ShootingDay, TeamMember, ChecklistItem, LocationAddress } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

const LocationPicker = dynamic(() => import('./location-picker').then(mod => mod.LocationPicker), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  photoURL: z.string().optional(),
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

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "O texto do item não pode ser vazio."),
  checked: z.boolean(),
});

const locationAddressSchema = z.object({
  displayName: z.string().optional(),
  road: z.string().optional(),
  house_number: z.string().optional(),
  city: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  postcode: z.string().optional(),
  country: z.string().optional(),
  suburb: z.string().optional(),
  neighbourhood: z.string().optional(),
  amenity: z.string().optional(),
  shop: z.string().optional(),
  tourism: z.string().optional(),
  office: z.string().optional(),
}).optional();

const sceneSchema = z.object({
    id: z.string(),
    sceneNumber: z.string().min(1, "Nº da cena é obrigatório."),
    title: z.string().min(1, "Título é obrigatório."),
    description: z.string().min(1, "Descrição é obrigatória."),
    pages: z.string().min(1, "Nº de páginas é obrigatório."),
    presentInScene: z.array(teamMemberSchema),
    location: locationAddressSchema,
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    equipment: z.array(checklistItemSchema).optional(),
    costumes: z.array(checklistItemSchema).optional(),
    props: z.array(checklistItemSchema).optional(),
});


const shootingDaySchema = z.object({
  date: z.date({ required_error: "A data da filmagem é obrigatória." }),
  dayNumber: z.coerce.number().optional(),
  totalDays: z.coerce.number().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: locationAddressSchema,
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  callTimes: z.array(callTimeSchema),
  scenes: z.array(sceneSchema),
  presentTeam: z.array(teamMemberSchema).optional(),
  mealTime: z.string().optional(),
  radioChannels: z.string().optional(),
  nearestHospital: hospitalSchema.optional(),
  generalNotes: z.string().optional(),
});


type FormValues = z.infer<typeof shootingDaySchema>;

interface CreateEditShootingDayDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => void;
  shootingDay?: (Omit<ShootingDay, 'generalNotes'> & { generalNotes?: string}) | null;
  productionTeam: TeamMember[];
}

const formatLocationForInput = (location?: LocationAddress): string => {
    if (!location) return "";
    const city = location.city || location.town || location.village || location.county;
    const state = location.state;
    const country = location.country;
    return [city, state, country].filter(Boolean).join(', ');
};

const ChecklistFormSection = ({ name, label, control }: { name: string, label: string, control: any }) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name,
    });

    return (
        <div>
            <FormLabel>{label}</FormLabel>
            <div className="space-y-2 mt-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField
                            control={control}
                            name={`${name}.${index}.text`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder="Descreva o item..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), text: "", checked: false })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Item
                </Button>
            </div>
        </div>
    );
}

export function CreateEditShootingDayDialog({ isOpen, setIsOpen, onSubmit, shootingDay, productionTeam }: CreateEditShootingDayDialogProps) {
  const isEditMode = !!shootingDay;
  const defaultPosition: [number, number] = [-14.235, -51.925]; // Brazil

  const form = useForm<FormValues>({
    resolver: zodResolver(shootingDaySchema),
    defaultValues: {
      date: undefined,
      location: { displayName: "" },
      latitude: defaultPosition[0],
      longitude: defaultPosition[1],
      scenes: [],
      callTimes: [],
      generalNotes: "",
      presentTeam: [],
      dayNumber: undefined,
      totalDays: undefined,
      startTime: "08:00",
      endTime: "18:00",
      mealTime: "12:00 - 13:00",
      radioChannels: "Canal 1 - Produção | Canal 2 - Direção",
      nearestHospital: { name: "", address: "", phone: "" },
    },
  });
  
  const lat = form.watch('latitude');
  const lng = form.watch('longitude');
  const location = form.watch('location');

  const [displayLocation, setDisplayLocation] = useState("");

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
          startTime: shootingDay.startTime || "",
          endTime: shootingDay.endTime || "",
          location: shootingDay.location || { displayName: "Localização não definida" },
          latitude: shootingDay.latitude || defaultPosition[0],
          longitude: shootingDay.longitude || defaultPosition[1],
          callTimes: Array.isArray(shootingDay.callTimes) ? shootingDay.callTimes : [],
          scenes: Array.isArray(shootingDay.scenes) ? shootingDay.scenes.map(s => ({...s, location: s.location || undefined, latitude: s.latitude, longitude: s.longitude})) : [],
          mealTime: shootingDay.mealTime || "",
          radioChannels: shootingDay.radioChannels || "",
          nearestHospital: shootingDay.nearestHospital || { name: "", address: "", phone: "" },
          presentTeam: shootingDay.presentTeam || [],
          generalNotes: shootingDay.generalNotes || "",
        });
      } else {
        form.reset({
            date: undefined,
            location: { displayName: "" },
            latitude: defaultPosition[0],
            longitude: defaultPosition[1],
            scenes: [],
            callTimes: [{ id: crypto.randomUUID(), department: "Chamada Geral", time: "08:00" }],
            generalNotes: "",
            presentTeam: [],
            dayNumber: undefined,
            totalDays: undefined,
            startTime: "08:00",
            endTime: "18:00",
            mealTime: "12:00 - 13:00",
            radioChannels: "Canal 1 - Produção | Canal 2 - Direção",
            nearestHospital: { name: "", address: "", phone: "" },
        });
      }
    }
  }, [isOpen, isEditMode, shootingDay, form]);
  
  useEffect(() => {
    setDisplayLocation(formatLocationForInput(location));
  }, [location]);

  const handleSubmit = (values: FormValues) => {
    const dataToSubmit: Omit<ShootingDay, 'id'> = {
        ...values,
        generalNotes: values.generalNotes || "",
        equipment: [], // Deprecated
        costumes: [], // Deprecated
        props: [], // Deprecated
    }
    onSubmit(dataToSubmit);
  };
  
  const handleLocationChange = (lat: number, lng: number, address: LocationAddress) => {
    form.setValue('latitude', lat);
    form.setValue('longitude', lng);
    form.setValue('location', address, { shouldValidate: true });
  };
  
  const handleSceneLocationChange = (index: number, lat: number, lng: number, address: LocationAddress) => {
    form.setValue(`scenes.${index}.latitude`, lat);
    form.setValue(`scenes.${index}.longitude`, lng);
    form.setValue(`scenes.${index}.location`, address, { shouldValidate: true });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-4xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Ordem do Dia</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes do dia de filmagem." : "Preencha os detalhes para a Ordem do Dia."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-6">
                <div className="space-y-6">
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Informações Gerais</h3>
                        <div className="border p-4 rounded-lg space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                initialFocus
                                                locale={ptBR}
                                                fromDate={new Date()}
                                            />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="startTime" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horário de Início</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="endTime" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horário de Término</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Localização Principal e Logística</h3>
                        <div className="border p-4 rounded-lg space-y-4">
                           <FormItem>
                                <FormLabel>Selecione em qual cidade vai ocorrer a produção:</FormLabel>
                                <FormControl>
                                    <Input readOnly placeholder="Selecione no mapa ou pesquise" value={displayLocation} />
                                </FormControl>
                                <FormDescription>Use a busca ou clique no mapa para definir a localização geral.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            <LocationPicker initialPosition={[lat || defaultPosition[0], lng || defaultPosition[1]]} onLocationChange={handleLocationChange} />
                             
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Informações de Segurança</h3>
                        <div className="border p-4 rounded-lg space-y-4">
                            <div>
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
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCallTime(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
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
                                    <div className="grid grid-cols-[100px_1fr_120px_auto] gap-2 items-end">
                                        <FormField control={form.control} name={`scenes.${index}.sceneNumber`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Cena Nº</FormLabel><FormControl><Input placeholder="Ex: 01A" {...field}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`scenes.${index}.title`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Título/Local</FormLabel><FormControl><Input placeholder="Ex: EXT. PARQUE - DIA" {...field}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`scenes.${index}.pages`} render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Páginas</FormLabel><FormControl><Input placeholder="Ex: 1 3/8" {...field}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeScene(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4"/></Button>
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
                                            <ScrollArea className="h-48 rounded-md border">
                                                <div className="p-4 space-y-2 grid grid-cols-2 md:grid-cols-3">
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
                                                                            const memberData = productionTeam.find(m => m.id === member.id);
                                                                            if (!memberData) return;
                                                                            return checked
                                                                            ? field.onChange([...(field.value || []), memberData])
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
                                            </ScrollArea>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <Collapsible>
                                        <CollapsibleTrigger asChild>
                                             <Button variant="outline" size="sm" className="w-full justify-between">
                                                Notas de Departamento e Localização da Cena
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="p-1 pt-4">
                                            <div className="border rounded-lg p-4 space-y-4">
                                                <FormField control={form.control} name={`scenes.${index}.location`} render={() => (
                                                    <FormItem>
                                                        <FormLabel>Localização Específica da Cena</FormLabel>
                                                        <FormDescription>Se esta cena tem uma localização diferente da principal, defina aqui.</FormDescription>
                                                        <FormControl>
                                                            <LocationPicker
                                                                initialPosition={[
                                                                    form.watch(`scenes.${index}.latitude`) || defaultPosition[0],
                                                                    form.watch(`scenes.${index}.longitude`) || defaultPosition[1]
                                                                ]}
                                                                onLocationChange={(lat, lng, address) => handleSceneLocationChange(index, lat, lng, address)}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <Separator />
                                                <ChecklistFormSection name={`scenes.${index}.equipment`} label="Equipamentos" control={form.control} />
                                                <ChecklistFormSection name={`scenes.${index}.costumes`} label="Figurino" control={form.control} />
                                                <ChecklistFormSection name={`scenes.${index}.props`} label="Objetos de Cena e Direção de Arte" control={form.control} />
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendScene({id: crypto.randomUUID(), sceneNumber: "", title: "", description: "", pages: "", presentInScene: [], equipment:[], costumes:[], props:[]})}>
                                <PlusCircle className="mr-2 h-4 w-4"/>Adicionar Cena
                            </Button>
                         </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Observações Gerais do Dia</h3>
                         <div className="border p-4 rounded-lg space-y-4">
                            <FormField
                                control={form.control}
                                name="generalNotes"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notas Gerais</FormLabel>
                                    <FormControl>
                                    <Textarea
                                        placeholder="Adicione aqui quaisquer observações gerais para a diária..."
                                        className="min-h-[100px]"
                                        {...field}
                                    />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
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
                                <ScrollArea className="h-48 rounded-md border">
                                    <div className="p-4 space-y-2 grid grid-cols-2 md:grid-cols-3">
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
                                                        const memberData = productionTeam.find(m => m.id === member.id);
                                                        if (!memberData) return;
                                                        return checked
                                                        ? field.onChange([...(field.value || []), memberData])
                                                        : field.onChange(field.value?.filter((p) => p.id !== member.id));
                                                    }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">
                                                    {member.name} <span className="text-muted-foreground">({member.role})</span>
                                                </FormLabel>
                                                </FormItem>
                                            )}
                                            />
                                        )) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro da equipe cadastrado na produção.</p>
                                        )}
                                    </div>
                                </ScrollArea>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>
            <SheetFooter className="flex-shrink-0 border-t p-4 pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Ordem do Dia"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
