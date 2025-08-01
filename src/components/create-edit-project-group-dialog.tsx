
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { ProjectGroup } from "@/lib/types";
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

const formSchema = z.object({
  name: z.string().min(2, "O nome do grupo deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEditProjectGroupDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<ProjectGroup, 'id' | 'userId' | 'createdAt'>) => void;
  group?: ProjectGroup | null;
}

export function CreateEditProjectGroupDialog({ isOpen, setIsOpen, onSubmit, group }: CreateEditProjectGroupDialogProps) {
  const isEditMode = !!group;

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
            name: group.name,
            description: group.description || "",
          }
        : {
            name: "",
            description: "",
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, group, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        name: values.name,
        description: values.description || ""
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Grupo de Projetos" : "Criar Novo Grupo"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes do seu grupo." : "Agrupe diferentes projetos sob uma única produção."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Produção 'Amanhecer'" {...field} />
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
                    <Textarea placeholder="Descreva a produção ou o objetivo deste grupo de projetos." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Grupo"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
