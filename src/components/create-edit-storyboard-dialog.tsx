
// @/src/components/create-edit-storyboard-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { Storyboard } from "@/lib/types";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const formSchema = z.object({
  name: z.string().min(2, "O nome do storyboard deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
  aspectRatio: z.enum(['16:9', '4:3']),
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
      aspectRatio: '16:9',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            name: storyboard.name,
            description: storyboard.description || "",
            aspectRatio: storyboard.aspectRatio || '16:9',
          }
        : {
            name: "",
            description: "",
            aspectRatio: '16:9' as const,
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, storyboard, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        name: values.name,
        description: values.description || "",
        aspectRatio: values.aspectRatio,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Storyboard" : "Criar Novo Storyboard"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Atualize os detalhes do seu storyboard." : "Dê um nome e uma breve descrição para seu storyboard."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
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
              name="aspectRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proporção dos Quadros</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a proporção" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                            <SelectItem value="4:3">Clássico (4:3)</SelectItem>
                        </SelectContent>
                    </Select>
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Storyboard"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
