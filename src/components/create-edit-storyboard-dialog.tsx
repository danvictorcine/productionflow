// @/src/components/create-edit-storyboard-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { Storyboard } from "@/lib/types";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  name: z.string().min(2, "O nome do storyboard deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEditStoryboardDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Storyboard, 'id' | 'userId' | 'createdAt'>) => void;
  storyboard?: Storyboard;
}

export function CreateEditStoryboardDialog({ isOpen, setIsOpen, onSubmit, storyboard }: CreateEditStoryboardDialogProps) {
  const isEditMode = !!storyboard;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            name: storyboard.name,
            description: storyboard.description || "",
          }
        : {
            name: "",
            description: "",
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, storyboard, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        name: values.name,
        description: values.description || "",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Storyboard" : "Criar Novo Storyboard"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes do seu storyboard." : "Dê um nome e uma breve descrição para seu storyboard."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 py-4 max-h-[80vh] overflow-y-auto">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Storyboard do curta 'Amanhecer'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva a visão geral, estilo ou premissa do projeto." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="mt-auto">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Storyboard"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
