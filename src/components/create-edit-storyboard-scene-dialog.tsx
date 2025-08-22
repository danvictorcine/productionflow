// @/src/components/create-edit-storyboard-scene-dialog.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import type { StoryboardScene } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const formSchema = z.object({
  title: z.string().min(2, "O título da cena deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
  aspectRatio: z.enum(['16:9', '4:3', '9:16', '2.39:1']),
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
      aspectRatio: '16:9',
    },
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = isEditMode
        ? {
            title: scene.title,
            description: scene.description || "",
            aspectRatio: scene.aspectRatio || '16:9',
          }
        : {
            title: "",
            description: "",
            aspectRatio: '16:9' as const,
          };
      form.reset(defaultValues);
    }
  }, [isOpen, isEditMode, scene, form]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
        title: values.title,
        description: values.description || "",
        aspectRatio: values.aspectRatio,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Editar Cena" : "Criar Nova Cena"}</SheetTitle>
          <SheetDescription>
            {isEditMode ? "Atualize os detalhes da sua cena." : "Adicione um título, descrição e proporção para a sua cena."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 py-4 max-h-[80vh] overflow-y-auto">
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
                name="aspectRatio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proporção da Cena</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Selecione a proporção" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                              <SelectItem value="4:3">Clássico (4:3)</SelectItem>
                              <SelectItem value="9:16">Mobile (9:16)</SelectItem>
                              <SelectItem value="2.39:1">Anamórfico (2.39:1)</SelectItem>
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
                      <Textarea placeholder="Breve resumo do que acontece nesta cena." {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="mt-auto">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button type="submit">{isEditMode ? "Salvar Alterações" : "Criar Cena"}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
