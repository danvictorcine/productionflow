// @/src/components/create-edit-production-dialog.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from 'next/link';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2, Users, Search, ChevronDown, Camera, User as UserIcon } from "lucide-react";
import imageCompression from 'browser-image-compression';


import type { Production, TeamMember, Talent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog as Sheet,
  DialogContent as SheetContent,
  DialogHeader as SheetHeader,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
  DialogFooter as SheetFooter,
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
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { getInitials, cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Checkbox } from "./ui/checkbox";
import { CopyableError } from "./copyable-error";
import { Loader2 } from "lucide-react";


const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome é obrigatório."),
  role: z.string().min(1, "Função é obrigatória."),
  photoURL: z.string().optional(),
  contact: z.string().optional(),
  hasDietaryRestriction: z.boolean().optional().default(false),
  dietaryRestriction: z.string().optional(),
  extraNotes: z.string().optional(),
});

const productionFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  type: z.string().min(2, "O tipo é obrigatório (ex: Curta-metragem)."),
  director: z.string().min(2, "O nome do diretor(a) é obrigatório."),
  responsibleProducer: z.string().optional(),
  client: z.string().optional(),
  producer: z.string().optional(),
  team: z.array(teamMemberSchema),
});

type ProductionFormValues = z.infer<typeof productionFormSchema>;

interface CreateEditProductionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Production, 'id' | 'userId' | 'createdAt'>) => void;
  production?: Production;
}

export function CreateEditProductionDialog({ isOpen, setIsOpen, onSubmit, production }: CreateEditProductionDialogProps) {
  const isEditMode = !!production;
  const { toast } = useToast();
  const [talentPool, setTalentPool] = useState<Talent[]>([]);
  const [isTalentSelectorOpen, setIsTalentSelectorOpen] = useState(false);

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      name: "",
      type: "",
      director: "",
      responsibleProducer: "",
      client: "",
      producer: "",
      team: [],
    },
  });

  const { control, watch } = form;

  const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
    control: form.control,
    name: "team",
  });
  
  const fetchTalents = async () => {
    try {
        const talents = await firestoreApi.getTalents();
        talents.sort((a, b) => a.name.localeCompare(b.name));
        setTalentPool(talents);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o banco de talentos." });
    }
  }

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            name: production.name,
            type: production.type,
            director: production.director,
            responsibleProducer: production.responsibleProducer || "",
            client: production.client || "",
            producer: production.producer || "",
            team: production.team || [],
          }
        : {
            name: "",
            type: "",
            director: "",
            responsibleProducer: "",
            client: "",
            producer: "",
            team: [],
          };
      form.reset(defaultValues);
      
      fetchTalents();
    }
  }, [isOpen, isEditMode, production, form]);
  

  const handleSubmit = (values: ProductionFormValues) => {
    onSubmit(values);
  };
  
  const handleSelectTalents = (selectedTalentIds: string[]) => {
    selectedTalentIds.forEach(id => {
        const talent = talentPool.find(t => t.id === id);
        if (talent && !teamFields.some(field => field.id === talent.id)) {
            appendTeam({
                id: talent.id,
                name: talent.name,
                role: "Função a definir", // Role is now project-specific
                photoURL: talent.photoURL,
                contact: talent.contact,
                hasDietaryRestriction: talent.hasDietaryRestriction,
                dietaryRestriction: talent.dietaryRestriction,
                extraNotes: talent.extraNotes,
            });
        }
    });
    setIsTalentSelectorOpen(false);
  }
  
  const combinedTeam = useMemo(() => {
    const existingIds = new Set(teamFields.map(t => t.id));
    const combined = [...teamFields];
    
    if (production?.team) {
        production.team.forEach(pt => {
            if (!existingIds.has(pt.id)) {
                combined.push(pt);
            }
        });
    }
    
    return combined;
  }, [production?.team, teamFields]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-2xl flex flex-col z-[9998]">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Produção" : "Criar Nova Produção"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes da produção." : "Preencha as informações principais da sua produção."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-6 space-y-4 max-h-[80vh]">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Produção</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: O Legado Perdido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Produção</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Curta-metragem, Publicidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="director"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diretor(a)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do(a) diretor(a)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="responsibleProducer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produtor(a) Responsável <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do(a) produtor(a)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="producer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produtora <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da produtora" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="client"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente <span className="text-xs text-muted-foreground">(Opcional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do(a) cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
                
                <Separator />

                <div>
                  <h3 className="text-lg font-semibold">Equipe & Elenco</h3>
                  <p className="text-sm text-muted-foreground">Cadastre todos os envolvidos na produção. As informações são sincronizadas com o Banco de Talentos, apenas a função é específica para este projeto.</p>
                  <div className="space-y-3 mt-4">
                    {teamFields.map((field, index) => {
                      return (
                         <Collapsible key={field.id} className="group border rounded-lg bg-card">
                              <div className="p-3 flex items-center justify-between">
                                  <CollapsibleTrigger asChild>
                                      <div className="flex-1 flex items-center gap-4 cursor-pointer">
                                           <Avatar className="h-12 w-12">
                                              <AvatarImage src={field.photoURL || undefined} alt={field.name} className="object-cover" />
                                              <AvatarFallback>{getInitials(field.name)}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                              <p className="font-semibold">{field.name || "Novo Talento"}</p>
                                              <p className="text-sm text-muted-foreground">{field.role || "Função não definida"}</p>
                                          </div>
                                      </div>
                                  </CollapsibleTrigger>
                                   <div className="flex items-center gap-1">
                                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeTeam(index)}>
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                      <CollapsibleTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                          </Button>
                                      </CollapsibleTrigger>
                                   </div>
                              </div>

                              <CollapsibleContent className="px-4 pb-4 pt-0">
                                  <div className="pt-4 border-t space-y-4">
                                      <FormField control={form.control} name={`team.${index}.role`} render={({ field }) => (
                                        <FormItem><FormLabel>Função no Projeto</FormLabel><FormControl><Input placeholder="ex: Ator, Diretor de Fotografia" {...field} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                      <p className="text-xs text-muted-foreground text-center pt-2">Para editar outras informações (nome, foto, etc.), acesse o <Link href="/talents" target="_blank" className="underline hover:text-primary">Banco de Talentos</Link>.</p>
                                  </div>
                              </CollapsibleContent>
                          </Collapsible>
                      )
                    })}
                    <Dialog open={isTalentSelectorOpen} onOpenChange={setIsTalentSelectorOpen}>
                       <DialogTrigger asChild>
                         <Button type="button" variant="outline" size="sm">
                            <Users className="mr-2 h-4 w-4" />
                            Adicionar Talento do Banco
                         </Button>
                       </DialogTrigger>
                       <DialogContent className="sm:max-w-md z-[9999]">
                          <DialogHeader>
                              <DialogTitle>Selecionar Talentos</DialogTitle>
                              <DialogDescription>Selecione os talentos do seu banco de contatos para adicionar à equipe desta produção.</DialogDescription>
                          </DialogHeader>
                          <TalentSelector
                              talentPool={talentPool}
                              teamInForm={combinedTeam}
                              onSelect={handleSelectTalents}
                              onTalentCreated={fetchTalents}
                          />
                       </DialogContent>
                     </Dialog>
                  </div>
                </div>
            </div>
            <SheetFooter className="flex-shrink-0 border-t p-4 pt-6 mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Produção"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}


const newTalentFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  contact: z.string().optional(),
  hasDietaryRestriction: z.boolean().optional(),
  dietaryRestriction: z.string().optional(),
  extraNotes: z.string().optional(),
  file: z.instanceof(File).optional(),
});
type NewTalentFormValues = z.infer<typeof newTalentFormSchema>;

function TalentSelector({ talentPool, teamInForm, onSelect, onTalentCreated }: { 
    talentPool: Talent[], 
    teamInForm: (TeamMember | { id: string })[],
    onSelect: (ids: string[]) => void,
    onTalentCreated: () => void 
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<'select' | 'create'>('select');
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    const form = useForm<NewTalentFormValues>({
        resolver: zodResolver(newTalentFormSchema),
        defaultValues: { name: "", contact: "", hasDietaryRestriction: false, dietaryRestriction: "", extraNotes: "", file: undefined },
    });
    
    const teamInFormIds = useMemo(() => new Set(teamInForm.map(t => t.id)), [teamInForm]);
    
    const filteredTalentPool = useMemo(() => {
        return talentPool
            .filter(talent => 
                talent.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [talentPool, searchTerm]);

    const handleCheckboxChange = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(sid => sid !== id));
        }
    }

    const resetFormAndGoBack = () => {
        form.reset();
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setView('select');
        setIsSaving(false);
    }
    
    const handleCreateNewTalent = async (values: NewTalentFormValues) => {
        setIsSaving(true);
        try {
            let photoURL: string | undefined = undefined;
            if (values.file) {
                const compressedFile = await imageCompression(values.file, { maxSizeMB: 0.5, maxWidthOrHeight: 512 });
                photoURL = await firestoreApi.uploadTalentPhoto(compressedFile);
            }

            const talentToSave: Omit<Talent, 'id' | 'userId'> = {
                name: values.name,
                contact: values.contact || "",
                hasDietaryRestriction: values.hasDietaryRestriction || false,
                dietaryRestriction: values.dietaryRestriction || "",
                extraNotes: values.extraNotes || "",
                photoURL: photoURL,
            };

            await firestoreApi.addTalent(talentToSave);
            toast({ title: "Talento criado com sucesso!" });
            onTalentCreated();
            resetFormAndGoBack();
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: "Erro ao Criar Talento", 
                description: <CopyableError userMessage="Não foi possível criar o novo talento." errorCode={errorTyped.code || errorTyped.message} />
            });
        } finally {
            setIsSaving(false);
        }
    };

     const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
          const file = event.target.files[0];
          form.setValue('file', file);
          setPhotoPreview(URL.createObjectURL(file));
        }
    };

    if (view === 'create') {
        return (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateNewTalent)} className="space-y-4">
                    <div className="flex justify-center">
                         <div className="relative group">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={photoPreview || undefined} alt="Avatar Preview" />
                                <AvatarFallback className="text-3xl"><UserIcon /></AvatarFallback>
                            </Avatar>
                            <label 
                              htmlFor="photo-upload-dialog" 
                              className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Camera className="h-6 w-6" />
                            </label>
                            <input ref={fileInputRef} id="photo-upload-dialog" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handlePhotoChange} disabled={isSaving}/>
                        </div>
                    </div>
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="contact" render={({ field }) => (
                        <FormItem><FormLabel>Contato (Opcional)</FormLabel><FormControl><Input placeholder="Telefone ou e-mail" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name={`hasDietaryRestriction`} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Possui restrição alimentar?</FormLabel></FormItem>)}/>
                      {form.watch('hasDietaryRestriction') && (<FormField control={form.control} name={`dietaryRestriction`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Qual restrição/alergia?</FormLabel><FormControl><Input placeholder="ex: Glúten, lactose..." {...field} /></FormControl><FormMessage /></FormItem>)}/>)}
                      <FormField control={form.control} name={`extraNotes`} render={({ field }) => (<FormItem><FormLabel>Observação Extra <span className="text-muted-foreground">(Opcional)</span></FormLabel><FormControl><Textarea placeholder="ex: Medicação específica..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>)}/>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={resetFormAndGoBack} disabled={isSaving}>Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Talento
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
             <ScrollArea className="h-72">
                 <div className="p-4 space-y-2">
                     {filteredTalentPool.map(talent => {
                        const isInProject = teamInFormIds.has(talent.id);
                        return (
                            <div key={talent.id} className="flex items-center space-x-3 rounded-md p-2">
                                <Checkbox
                                    id={`talent-prod-${talent.id}`}
                                    checked={selectedIds.includes(talent.id)}
                                    onCheckedChange={(checked) => handleCheckboxChange(talent.id, !!checked)}
                                    disabled={isInProject}
                                />
                                <label 
                                  htmlFor={`talent-prod-${talent.id}`} 
                                  className={cn(
                                    "flex items-center gap-3 text-sm font-medium leading-none w-full", 
                                    isInProject && "cursor-not-allowed opacity-50"
                                  )}
                                >
                                     <Avatar className="h-9 w-9">
                                        <AvatarImage src={talent.photoURL || undefined} alt={talent.name} />
                                        <AvatarFallback>{getInitials(talent.name)}</AvatarFallback>
                                    </Avatar>
                                    <p>{talent.name}</p>
                                </label>
                            </div>
                        )
                    })}
                 </div>
             </ScrollArea>
             <DialogFooter className="justify-between">
                 <Button type="button" variant="outline" onClick={() => setView('create')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo
                 </Button>
                 <Button onClick={() => onSelect(selectedIds)}>Adicionar Selecionados</Button>
             </DialogFooter>
        </div>
    )
}
