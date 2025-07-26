// @/src/components/create-edit-storyboard-scene-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { StoryboardScene } from "@/lib/types";
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
  title: z.string().min(2, "O título da cena deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEditStoryboardSceneDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: Omit<StoryboardScene, 'id' | 'storyboardId' | 'userId' | 'order' | 'createdAt'>) => void;
  scene?: StoryboardScene | null;
}

export function CreateEditStoryboardSceneDialog({ isOpen, setIsOpen, onSubmit, scene }: CreateEditStoryboardSceneDialogProps) {
  const isEditMode = !!scene;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            title: scene.title,
            description: scene.description || "",
          }
        : {
            title: "",
            description: "",
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, scene, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        title: values.title,
        description: values.description || ""
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Cena" : "Criar Nova Cena"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize o título e a descrição da sua cena." : "Adicione um título e uma descrição para organizar seus quadros."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Cena</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: CENA 01 - COZINHA (DIA)" {...field} />
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
                    <Textarea placeholder="Breve resumo do que acontece nesta cena." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Cena"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
