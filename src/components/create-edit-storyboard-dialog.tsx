// @/src/components/create-edit-storyboard-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { Storyboard } from "@/lib/types";
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
  groupId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEditStoryboardDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<Storyboard, 'id' | 'userId' | 'createdAt'>) => void;
  storyboard?: Storyboard;
  groupId?: string;
}

export function CreateEditStoryboardDialog({ isOpen, setIsOpen, onSubmit, storyboard, groupId }: CreateEditStoryboardDialogProps) {
  const isEditMode = !!storyboard;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      aspectRatio: '16:9',
      groupId: groupId,
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            name: storyboard.name,
            description: storyboard.description || "",
            aspectRatio: storyboard.aspectRatio || '16:9',
            groupId: storyboard.groupId || groupId,
          }
        : {
            name: "",
            description: "",
            aspectRatio: '16:9' as const,
            groupId: groupId,
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, storyboard, groupId, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        name: values.name,
        description: values.description || "",
        aspectRatio: values.aspectRatio,
        groupId: values.groupId,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Storyboard" : "Criar Novo Storyboard"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes do seu storyboard." : "Dê um nome e uma breve descrição para seu storyboard."}
          </SheetDescription>
        </SheetHeader>
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
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Storyboard"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
