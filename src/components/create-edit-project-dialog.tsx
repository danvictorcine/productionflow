"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2 } from "lucide-react";
import { useEffect } from "react";

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
import { Switch } from "@/components/ui/switch";
import type { Project } from "@/lib/types";


const talentSchema = z.object({
  name: z.string().min(1, "Nome do talento é obrigatório."),
  role: z.string().min(1, "Função é obrigatória."),
  fee: z.coerce.number().min(0, "Cachê não pode ser negativo."),
});

const projectFormSchema = z.object({
  name: z.string().min(2, "O nome do projeto deve ter pelo menos 2 caracteres."),
  budget: z.coerce.number().positive("O orçamento deve ser um número positivo."),
  productionCosts: z.coerce.number().min(0, "Custos de produção não podem ser negativos."),
  includeProductionCostsInBudget: z.boolean().default(true),
  talents: z.array(talentSchema),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateEditProjectDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (projectData: Omit<Project, 'id'>) => void;
  project?: Project;
}

export function CreateEditProjectDialog({ isOpen, setIsOpen, onSubmit, project }: CreateEditProjectDialogProps) {
  const isEditMode = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      budget: 0,
      productionCosts: 0,
      includeProductionCostsInBudget: true,
      talents: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? { 
            name: project.name,
            budget: project.budget,
            productionCosts: project.productionCosts,
            includeProductionCostsInBudget: project.includeProductionCostsInBudget ?? true,
            talents: project.talents.map(t => ({...t}))
          }
        : {
            name: "",
            budget: 0,
            productionCosts: 0,
            includeProductionCostsInBudget: true,
            talents: [],
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, project, form]);
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "talents",
  });

  const handleSubmit = (values: ProjectFormValues) => {
    const talentsWithIds = values.talents.map((t, index) => ({
      ...t,
      id: project?.talents[index]?.id || crypto.randomUUID(),
    }));
    onSubmit({ ...values, talents: talentsWithIds });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Projeto" : "Criar Novo Projeto"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize os detalhes do seu projeto." : "Preencha os detalhes abaixo para criar seu projeto."}
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
                      <FormLabel>Nome do Projeto</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Meu Curta-Metragem" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orçamento Global (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="productionCosts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custos de Produção (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                 <FormField
                  control={form.control}
                  name="includeProductionCostsInBudget"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                      <div className="space-y-0.5">
                        <FormLabel>Subtrair custos de produção do orçamento?</FormLabel>
                        <FormDescription>
                            Se ativado, o valor planejado para custos de produção será deduzido do orçamento.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div>
                  <FormLabel>Equipe e Talentos</FormLabel>
                  <div className="space-y-3 mt-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 items-end gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_130px_auto]">
                        <FormField
                          control={form.control}
                          name={`talents.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nome</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do Talento" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`talents.${index}.role`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Função</FormLabel>
                              <FormControl>
                                <Input placeholder="ex: Ator Principal" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`talents.${index}.fee`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Cachê (R$)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="5000.00" {...field} />
                              </FormControl>
                               <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="w-full md:w-auto">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: "", role: "", fee: 0 })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Talento
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 border-t p-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Projeto"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
