// @/src/components/create-edit-production-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2 } from "lucide-react";

import type { Production, TeamMember } from "@/lib/types";
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

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome é obrigatório."),
  role: z.string().min(1, "Função é obrigatória."),
  hasDietaryRestriction: z.boolean().optional().default(false),
  dietaryRestriction: z.string().optional(),
  extraNotes: z.string().optional(),
});

const productionFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  type: z.string().min(2, "O tipo é obrigatório (ex: Curta-metragem)."),
  director: z.string().min(2, "O nome do diretor(a) é obrigatório."),
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

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      name: "",
      type: "",
      director: "",
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

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            name: production.name,
            type: production.type,
            director: production.director,
            client: production.client || "",
            producer: production.producer || "",
            team: production.team || [],
          }
        : {
            name: "",
            type: "",
            director: "",
            client: "",
            producer: "",
            team: [],
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, production, form]);

  const handleSubmit = (values: ProductionFormValues) => {
    const teamWithIds = values.team.map((t) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
    }));
    const dataToSubmit = {
      ...values,
      client: values.client || undefined,
      producer: values.producer || undefined,
      team: teamWithIds,
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Produção" : "Criar Nova Produção"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize os detalhes da produção." : "Preencha as informações principais da sua produção."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 pt-2">
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
                   </div>
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
                  
                  <Separator />

                  <div>
                    <FormLabel>Equipe & Elenco</FormLabel>
                    <FormDescription>Cadastre todos os envolvidos na produção. Esta lista será usada para montar a Ordem do Dia.</FormDescription>
                    <div className="space-y-3 mt-2">
                      {teamFields.map((field, index) => {
                        const hasRestriction = watch(`team.${index}.hasDietaryRestriction`);
                        return (
                          <div key={field.id} className="grid grid-cols-1 items-start gap-4 rounded-md border p-4">
                            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
                              <FormField control={form.control} name={`team.${index}.name`} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Nome</FormLabel><FormControl><Input placeholder="Nome do membro" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField control={form.control} name={`team.${index}.role`} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">Função</FormLabel><FormControl><Input placeholder="ex: Ator, Diretor de Fotografia" {...field} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <Button type="button" variant="destructive" size="icon" onClick={() => removeTeam(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                             <div className="space-y-4">
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
                      <Button type="button" variant="outline" size="sm" onClick={() => appendTeam({ id: crypto.randomUUID(), name: "", role: "", hasDietaryRestriction: false, dietaryRestriction: "", extraNotes: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Membro
                      </Button>
                    </div>
                  </div>
                </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t p-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Produção"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
