"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Lightbulb, Loader2 } from "lucide-react";

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
import { getCategorySuggestions } from "@/app/actions";
import { cn } from "@/lib/utils";
import { EXPENSE_CATEGORIES, type Transaction, type ExpenseCategory } from "@/lib/types";

const formSchema = z
  .object({
    description: z
      .string()
      .min(2, { message: "A descrição deve ter pelo menos 2 caracteres." }),
    amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
    date: z.date(),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    type: z.enum(["revenue", "expense"]),
  })
  .refine(
    (data) => {
      if (data.type === "expense") {
        return !!data.category;
      }
      return true;
    },
    {
      message: "A categoria é obrigatória para despesas.",
      path: ["category"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  type: "revenue" | "expense";
  onSubmit: (transaction: Omit<Transaction, "id">) => void;
}

export function AddTransactionSheet({
  isOpen,
  setIsOpen,
  type,
  onSubmit,
}: AddTransactionSheetProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      type: type,
    },
  });

  const currentType = form.watch("type");
  if (currentType !== type) {
    form.reset({
      description: "",
      amount: 0,
      date: new Date(),
      category: undefined,
      type: type,
    });
  }

  const handleSuggestCategory = async () => {
    const description = form.getValues("description");
    if (!description) {
      toast({
        variant: "destructive",
        title: "Sem Descrição",
        description: "Por favor, insira uma descrição para obter sugestões.",
      });
      return;
    }

    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const result = await getCategorySuggestions(description);
      setSuggestions(result);
      if(result.length === 0){
        toast({ title: "Nenhuma sugestão específica encontrada." });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na Sugestão",
        description: "Não foi possível buscar sugestões de categoria.",
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        ...values,
        amount: Number(values.amount)
    });
    form.reset();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            Adicionar {type === "revenue" ? "Receita" : "Despesa"}
          </SheetTitle>
          <SheetDescription>
            Insira os detalhes da sua{" "}
            {type === "revenue" ? "receita" : "despesa"}.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-4"
          >
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
                    <Input type="number" placeholder="1000.00" {...field} />
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
            {type === "expense" && (
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
                            {EXPENSE_CATEGORIES.map((cat) => (
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
                        onClick={handleSuggestCategory}
                        disabled={isSuggesting}
                        aria-label="Sugerir Categoria"
                      >
                        {isSuggesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Lightbulb className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                          {suggestions.map((s) => (
                              <Button
                                  key={s}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => form.setValue('category', s as ExpenseCategory, { shouldValidate: true })}
                              >
                                  {s}
                              </Button>
                          ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <SheetFooter className="pt-4">
              <Button type="submit">Salvar Transação</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
