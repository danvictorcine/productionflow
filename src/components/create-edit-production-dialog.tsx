
// @/src/components/create-edit-production-dialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2, Camera, User as UserIcon, Loader2 } from "lucide-react";
import imageCompression from 'browser-image-compression';

import type { Production, TeamMember } from "@/lib/types";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import * as firestoreApi from '@/lib/firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { CopyableError } from "./copyable-error";

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome é obrigatório."),
  role: z.string().min(1, "Função é obrigatória."),
  photoURL: z.string().optional(),
  file: z.instanceof(File).optional(),
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
  const [isUploading, setIsUploading] = useState<Record<number, boolean>>({});

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

  const { control, watch, setValue } = form;

  const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
    control: form.control,
    name: "team",
  });
  
  const watchedTeam = watch('team');

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
    }
  }, [isOpen, isEditMode, production, form]);
  
  const handlePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;
        
        const file = event.target.files[0];
        setValue(`team.${index}.file`, file);
        setIsUploading(prev => ({ ...prev, [index]: true }));

        try {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 256, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            const url = await firestoreApi.uploadProductionTeamMemberPhoto(compressedFile);
            
            setValue(`team.${index}.photoURL`, url, { shouldDirty: true });
            toast({ title: 'Foto enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro de Upload',
                description: <CopyableError userMessage="Não foi possível enviar a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsUploading(prev => ({ ...prev, [index]: false }));
        }
    };


  const handleSubmit = (values: ProductionFormValues) => {
    const sanitizedTeam = values.team.map((member) => {
      const { file, ...rest } = member;
      return {
        ...rest,
        id: member.id.startsWith('new-') ? '' : member.id,
        contact: member.contact || "",
        photoURL: member.photoURL || "",
        dietaryRestriction: member.dietaryRestriction || "",
        extraNotes: member.extraNotes || "",
      };
    });

    const dataToSubmit = {
      name: values.name,
      type: values.type,
      director: values.director,
      responsibleProducer: values.responsibleProducer || "",
      client: values.client || "",
      producer: values.producer || "",
      team: sanitizedTeam.map(({ id, ...rest }) => ({...rest, id: id || crypto.randomUUID() })),
    };
    
    onSubmit(dataToSubmit);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Produção" : "Criar Nova Produção"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes da produção." : "Preencha as informações principais da sua produção."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-6">
                <div className="space-y-4">
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
                    <p className="text-sm text-muted-foreground">Cadastre todos os envolvidos na produção. Esta lista será usada para montar a Ordem do Dia.</p>
                    <div className="space-y-3 mt-2">
                      {teamFields.map((field, index) => {
                        const hasRestriction = watch(`team.${index}.hasDietaryRestriction`);
                        const photoURL = watchedTeam[index]?.photoURL;
                        const file = watchedTeam[index]?.file;
                        let previewUrl = photoURL;
                        if (file && !photoURL?.startsWith('https://firebasestorage')) {
                            previewUrl = URL.createObjectURL(file);
                        }

                        return (
                          <div key={field.id} className="items-start gap-4 rounded-md border p-4">
                            <div className="flex items-center gap-4 mb-4">
                               <div className="relative group">
                                  <Avatar className="h-20 w-20">
                                      <AvatarImage src={previewUrl} alt="Foto" className="object-cover" />
                                      <AvatarFallback><UserIcon /></AvatarFallback>
                                  </Avatar>
                                  <label htmlFor={`photo-upload-${index}`} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                      {isUploading[index] ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                                  </label>
                                  <input id={`photo-upload-${index}`} type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handlePhotoUpload(index, e)} disabled={isUploading[index]} />
                                </div>
                               <div className="grid grid-cols-1 items-end gap-3 flex-1">
                                <div className="flex items-end gap-2">
                                  <FormField control={form.control} name={`team.${index}.name`} render={({ field }) => (
                                    <FormItem className="flex-1"><FormLabel className="text-xs">Nome</FormLabel><FormControl><Input placeholder="Nome do membro" {...field} /></FormControl><FormMessage /></FormItem>
                                  )}/>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTeam(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                                <FormField control={form.control} name={`team.${index}.role`} render={({ field }) => (
                                  <FormItem><FormLabel className="text-xs">Função</FormLabel><FormControl><Input placeholder="ex: Ator, Diretor de Fotografia" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                              </div>
                            </div>
                             <div className="space-y-4">
                                <FormField
                                  control={control}
                                  name={`team.${index}.contact`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Contato (Telefone) <span className="text-muted-foreground">(Opcional)</span></FormLabel>
                                      <FormControl>
                                        <Input placeholder="ex: (75) 99123-4567" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                               <FormField
                                control={control}
                                name={`team.${index}.hasDietaryRestriction`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm">
                                      Possui restrição alimentar?
                                    </FormLabel>
                                  </FormItem>
                                )}
                              />
                              {hasRestriction && (
                                <FormField
                                  control={control}
                                  name={`team.${index}.dietaryRestriction`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Qual restrição/alergia?</FormLabel>
                                      <FormControl>
                                        <Input placeholder="ex: Glúten, lactose, amendoim..." {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                               <FormField
                                control={control}
                                name={`team.${index}.extraNotes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Observação Extra <span className="text-muted-foreground">(Opcional)</span></FormLabel>
                                    <FormControl>
                                      <Textarea placeholder="ex: Medicação específica, necessidade especial..." {...field} rows={2} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )
                      })}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendTeam({ id: `new-${Date.now()}`, name: "", role: "", photoURL: "", contact: "", hasDietaryRestriction: false, dietaryRestriction: "", extraNotes: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Membro
                      </Button>
                    </div>
                  </div>
                </div>
            </div>
            <SheetFooter className="flex-shrink-0 border-t p-4 pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={Object.values(isUploading).some(v => v)}>{isEditMode ? "Salvar Alterações" : "Criar Produção"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
