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
import { ScrollArea } from "./ui/scroll-area";

const formSchema = z.object({
  description: z
    .string()
    .min(2, { message: "A descrição deve ter pelo menos 2 caracteres." }),
  amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
  date: z.date(),
  category: z.enum(EXPENSE_CATEGORIES),
});

type FormValues = z.infer<typeof formSchema>;

interface AddTransactionSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (transaction: Omit<Transaction, "id" | "projectId" | "type">) => void;
}

export function AddTransactionSheet({
  isOpen,
  setIsOpen,
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
    },
  });

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
    setSuggestions([]);
  };

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
      setSuggestions([]);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Adicionar Despesa</SheetTitle>
          <SheetDescription>
            Insira os detalhes da sua despesa.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 flex flex-col overflow-y-hidden"
          >
            <ScrollArea className="flex-1 p-4 -mx-6">
                <div className="space-y-4 px-6">

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
                        <FormLabel>Valor (R$)</FormLabel>
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

                </div>
            </ScrollArea>
            <SheetFooter className="pt-4 mt-auto border-t">
              <Button type="submit">Salvar Despesa</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
