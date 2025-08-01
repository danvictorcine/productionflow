"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2, Calendar as CalendarIcon, Info } from "lucide-react";
import { useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
import { Switch } from "@/components/ui/switch";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "./ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";


const talentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do talento é obrigatório."),
  role: z.string().min(1, "Função é obrigatória."),
  paymentType: z.enum(['fixed', 'daily']).default('fixed'),
  fee: z.coerce.number().optional(),
  dailyRate: z.coerce.number().optional(),
  days: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    if (data.paymentType === 'fixed' && (data.fee === undefined || data.fee <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cachê deve ser positivo.",
            path: ["fee"],
        });
    }
    if (data.paymentType === 'daily') {
        if (data.dailyRate === undefined || data.dailyRate <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Valor da diária deve ser positivo.",
                path: ["dailyRate"],
            });
        }
        if (data.days === undefined || data.days <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Nº de diárias deve ser positivo.",
                path: ["days"],
            });
        }
    }
});


const installmentSchema = z.object({
  id: z.string(),
  amount: z.coerce.number().positive("O valor da parcela deve ser positivo."),
  date: z.date(),
  description: z.string().min(1, "A descrição da parcela é obrigatória."),
});

const projectFormSchema = z.object({
  name: z.string().min(2, "O nome do projeto deve ter pelo menos 2 caracteres."),
  budget: z.coerce.number().positive("O orçamento deve ser um número positivo."),
  hasProductionCosts: z.boolean().default(true),
  productionCosts: z.coerce.number().min(0, "O valor de produção não pode ser negativo."),
  includeProductionCostsInBudget: z.boolean().default(true),
  talents: z.array(talentSchema),
  isBudgetParcelado: z.boolean().default(false),
  installments: z.array(installmentSchema),
  groupId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isBudgetParcelado) {
    const totalInstallments = data.installments.reduce((sum, inst) => sum + inst.amount, 0);
    if (totalInstallments > data.budget) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A soma das parcelas não pode exceder o orçamento total do projeto.",
        path: ["installments"],
      });
    }
  }
});


type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateEditProjectDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (projectData: Omit<Project, 'id' | 'userId'>) => void;
  project?: Project;
  groupId?: string;
}

export function CreateEditProjectDialog({ isOpen, setIsOpen, onSubmit, project, groupId }: CreateEditProjectDialogProps) {
  const isEditMode = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      budget: 0,
      hasProductionCosts: true,
      productionCosts: 0,
      includeProductionCostsInBudget: true,
      talents: [],
      isBudgetParcelado: false,
      installments: [],
      groupId: groupId,
    },
  });
  
  const { formState: { errors }, control } = form;

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? { 
            name: project.name,
            budget: project.budget,
            hasProductionCosts: project.hasProductionCosts ?? true,
            productionCosts: project.productionCosts,
            includeProductionCostsInBudget: project.includeProductionCostsInBudget ?? true,
            talents: project.talents?.map(t => ({...t, paymentType: t.paymentType || 'fixed'})) ?? [],
            isBudgetParcelado: project.isBudgetParcelado ?? false,
            installments: project.installments?.map(i => ({ ...i, date: new Date(i.date) })) ?? [],
            groupId: project.groupId || groupId,
          }
        : {
            name: "",
            budget: 0,
            hasProductionCosts: true,
            productionCosts: 0,
            includeProductionCostsInBudget: true,
            talents: [],
            isBudgetParcelado: false,
            installments: [],
            groupId: groupId,
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, project, groupId, form]);
  
  const { fields: talentFields, append: appendTalent, remove: removeTalent } = useFieldArray({
    control: form.control,
    name: "talents",
  });
  
  const { fields: installmentFields, append: appendInstallment, remove: removeInstallment } = useFieldArray({
    control: form.control,
    name: "installments",
  });
  
  const isParcelado = form.watch("isBudgetParcelado");
  const hasProductionCosts = form.watch("hasProductionCosts");

  useEffect(() => {
    if (!hasProductionCosts) {
      form.setValue("productionCosts", 0);
      form.setValue("includeProductionCostsInBudget", false);
    }
  }, [hasProductionCosts, form]);

  const handleSubmit = (values: ProjectFormValues) => {
    const talentsWithIds = values.talents.map((t, index) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
    }));
    const installmentsWithIds = values.installments.map((i, index) => ({
      ...i,
      id: i.id || crypto.randomUUID(),
    }));
    onSubmit({ ...values, talents: talentsWithIds, installments: installmentsWithIds });
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Projeto" : "Criar Novo Projeto"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes do seu projeto." : "Preencha os detalhes abaixo para criar seu projeto."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-1 pr-6">
                <div className="space-y-6">
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
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orçamento Total</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="R$ 0,00"
                            value={
                              field.value
                                ? new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(field.value)
                                : ""
                            }
                            onChange={(e) => {
                              const numericValue = e.target.value.replace(/\D/g, "");
                              field.onChange(Number(numericValue) / 100);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasProductionCosts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                        <div className="space-y-0.5">
                          <FormLabel>Trabalhar com Valor de Produção?</FormLabel>
                          <FormDescription>
                              Ative para separar um valor de produção do orçamento total.
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
                  
                  {hasProductionCosts && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                        control={form.control}
                        name="productionCosts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor de Produção</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="R$ 0,00"
                                value={
                                  field.value
                                    ? new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(field.value)
                                    : ""
                                }
                                onChange={(e) => {
                                  const numericValue = e.target.value.replace(/\D/g, "");
                                  field.onChange(Number(numericValue) / 100);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="includeProductionCostsInBudget"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                            <div className="space-y-0.5">
                              <FormLabel>Subtrair valor de produção do orçamento?</FormLabel>
                              <FormDescription>
                                  Se ativado, o valor de produção planejado será deduzido do orçamento.
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
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="isBudgetParcelado"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                        <div className="space-y-0.5">
                          <FormLabel>Essa produção possui orçamento parcelado?</FormLabel>
                          <FormDescription>
                            Ative para gerenciar o projeto com base nas parcelas recebidas.
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

                  {isParcelado && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormLabel>Parcelas Recebidas</FormLabel>
                      <FormDescription>Adicione as parcelas do orçamento que já foram recebidas.</FormDescription>
                       {errors.installments && (
                         <Alert variant="destructive" className="flex items-start">
                            <Info className="h-4 w-4 mr-2 mt-0.5"/>
                            <AlertDescription>{errors.installments.root?.message}</AlertDescription>
                         </Alert>
                       )}
                      <div className="space-y-3">
                        {installmentFields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-1 items-end gap-3 rounded-md border p-3 md:grid-cols-[1fr_130px_1fr_auto]">
                             <FormField
                              control={form.control}
                              name={`installments.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Descrição</FormLabel>
                                  <FormControl>
                                    <Input placeholder="ex: 1ª Parcela" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`installments.${index}.amount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Valor</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="text" placeholder="R$ 0,00"
                                      value={ field.value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(field.value) : ""}
                                      onChange={(e) => {
                                        const numericValue = e.target.value.replace(/\D/g, "");
                                        field.onChange(Number(numericValue) / 100);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={form.control}
                              name={`installments.${index}.date`}
                              render={({ field }) => (
                                <FormItem className="flex flex-col">
                                  <FormLabel className="text-xs">Data de Recebimento</FormLabel>
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
                              )}
                            />
                            <Button type="button" variant="destructive" size="icon" onClick={() => removeInstallment(index)} className="w-full md:w-auto">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => appendInstallment({ id: crypto.randomUUID(), description: "", amount: 0, date: new Date() })}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Adicionar Parcela
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <FormLabel>Equipe e Talentos</FormLabel>
                    <div className="space-y-3 mt-2">
                      {talentFields.map((field, index) => {
                        const paymentType = form.watch(`talents.${index}.paymentType`);
                        return (
                          <div key={field.id} className="grid grid-cols-1 gap-4 rounded-md border p-4">
                            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                                <FormField control={control} name={`talents.${index}.name`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Nome</FormLabel><FormControl><Input placeholder="Nome do Talento" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={control} name={`talents.${index}.role`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Função</FormLabel><FormControl><Input placeholder="ex: Ator Principal" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={control} name={`talents.${index}.paymentType`} render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs">Tipo de Pagamento</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="fixed">Cachê Fixo</SelectItem>
                                            <SelectItem value="daily">Por Diária</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage /></FormItem>
                                )}/>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeTalent(index)} className="self-end"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            {paymentType === 'fixed' && (
                                <FormField control={control} name={`talents.${index}.fee`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Cachê Fixo</FormLabel>
                                        <FormControl>
                                            <Input type="text" placeholder="R$ 0,00" value={field.value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(field.value) : ""} onChange={(e) => {
                                                const numericValue = e.target.value.replace(/\D/g, ""); field.onChange(Number(numericValue) / 100);
                                            }}/>
                                        </FormControl><FormMessage />
                                    </FormItem>
                                )}/>
                            )}
                            {paymentType === 'daily' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <FormField control={control} name={`talents.${index}.dailyRate`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Valor da Diária</FormLabel>
                                            <FormControl>
                                                <Input type="text" placeholder="R$ 0,00" value={field.value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(field.value) : ""} onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/\D/g, ""); field.onChange(Number(numericValue) / 100);
                                                }}/>
                                            </FormControl><FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={control} name={`talents.${index}.days`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs">Nº de Diárias</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="ex: 3" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}/>
                                            </FormControl><FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                            )}
                          </div>
                        )
                      })}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendTalent({ id: crypto.randomUUID(), name: "", role: "", paymentType: "fixed", fee: 0 })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Talento
                      </Button>
                    </div>
                  </div>
              </div>
            </div>
            <SheetFooter className="flex-shrink-0 border-t p-4 pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Projeto"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
