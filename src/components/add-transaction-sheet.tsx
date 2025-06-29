"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DEFAULT_EXPENSE_CATEGORIES, type Transaction, type ExpenseCategory, type Project } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


const formSchema = z.object({
  description: z
    .string()
    .min(2, { message: "A descrição deve ter pelo menos 2 caracteres." }),
  amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  date: z.date(),
  category: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (transaction: Omit<Transaction, "projectId" | "type" | "userId"> & { id?: string }) => void;
  transactionToEdit?: Transaction | null;
  project: Project;
  onProjectUpdate: (data: Partial<Project>) => Promise<void>;
}

export function AddTransactionSheet({
  isOpen,
  setIsOpen,
  onSubmit,
  transactionToEdit,
  project,
  onProjectUpdate,
}: AddTransactionSheetProps) {
  const [isAddCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toast } = useToast();

  const isEditMode = !!transactionToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      category: undefined,
    },
  });

  const allCategories = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...(project.customCategories || []),
  ];

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && transactionToEdit) {
        form.reset({
          ...transactionToEdit,
          category: transactionToEdit.category || undefined,
        });
      } else {
        form.reset({
          description: "",
          amount: 0,
          date: new Date(),
          category: undefined,
        });
      }
    }
  }, [isOpen, isEditMode, transactionToEdit, form]);
  
  const handleAddNewCategory = async () => {
    if (!newCategoryName || !project) return;
    
    const normalizedNewCategory = newCategoryName.trim();
    if (allCategories.map(c => c.toLowerCase()).includes(normalizedNewCategory.toLowerCase())) {
        toast({ variant: "destructive", title: "Categoria já existe." });
        return;
    }

    const updatedCategories = [...(project.customCategories || []), normalizedNewCategory];
    try {
        await onProjectUpdate({ customCategories: updatedCategories });
        form.setValue('category', normalizedNewCategory, { shouldValidate: true });
        setNewCategoryName('');
        setAddCategoryOpen(false);
        toast({ title: "Categoria adicionada!" });
    } catch (error) {
        toast({ variant: "destructive", title: "Erro ao adicionar categoria" });
    }
  };


  const handleSubmit = (values: FormValues) => {
    onSubmit({
        ...values,
        id: isEditMode ? transactionToEdit.id : undefined,
        amount: Number(values.amount)
    });
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>{isEditMode ? "Editar Despesa" : "Adicionar Despesa"}</SheetTitle>
            <SheetDescription>
              {isEditMode ? "Atualize os detalhes da sua despesa." : "Insira os detalhes da sua despesa."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                      <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                              <Input placeholder="ex: Aluguel de câmera" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Valor</FormLabel>
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
                      name="date"
                      render={({ field }) => (
                          <FormItem className="flex flex-col">
                          <FormLabel>Data</FormLabel>
                          <Popover>
                              <PopoverTrigger asChild>
                              <FormControl>
                                  <Button
                                  variant={"outline"}
                                  className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                  )}
                                  >
                                  {field.value ? (
                                      format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                      <span>Escolha uma data</span>
                                  )}
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
                              />
                              </PopoverContent>
                          </Popover>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <div className="flex gap-2">
                              <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                  >
                                  <FormControl>
                                      <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma categoria" />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {allCategories.map((cat) => (
                                      <SelectItem key={cat} value={cat}>
                                          {cat}
                                      </SelectItem>
                                      ))}
                                  </SelectContent>
                                  </Select>
                              <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setAddCategoryOpen(true)}
                                  aria-label="Adicionar Nova Categoria"
                              >
                                  <Plus className="h-4 w-4" />
                              </Button>
                              </div>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
              </div>
              <SheetFooter className="flex-shrink-0 pt-4 border-t">
                <Button type="submit">{isEditMode ? "Salvar Alterações" : "Salvar Despesa"}</Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      <AlertDialog open={isAddCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Nova Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o nome para a nova categoria de despesa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="ex: Catering"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewCategory(); } }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddNewCategory}>Adicionar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
