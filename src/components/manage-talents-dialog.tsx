// @/components/manage-talents-dialog.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle, Trash2, Camera, User as UserIcon, AlertTriangle, ChevronDown, Search, Save } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { Talent } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyableError } from '@/components/copyable-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';


const talentSchema = z.object({
    id: z.string(),
    name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
    photoURL: z.string().optional(),
    contact: z.string().optional(),
    hasDietaryRestriction: z.boolean().optional(),
    dietaryRestriction: z.string().optional(),
    extraNotes: z.string().optional(),
    file: z.instanceof(File).optional(),
});

const formSchema = z.object({
  talents: z.array(talentSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface ManageTalentsDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function ManageTalentsDialog({ isOpen, setIsOpen }: ManageTalentsDialogProps) {
    const { toast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});
    const [isUploading, setIsUploading] = useState<Record<number, boolean>>({});
    const [isMigrating, setIsMigrating] = useState(false);
    const [legacyTeamMembers, setLegacyTeamMembers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [talentToDelete, setTalentToDelete] = useState<{ id: string; name: string, isNew: boolean, index: number } | null>(null);


    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { 
            talents: [],
        },
    });

    const { control, handleSubmit, setValue, watch, trigger, formState: { dirtyFields, isSubmitting }, getValues, reset } = form;
    const { fields, prepend, remove } = useFieldArray({
        control,
        name: "talents",
    });

    const watchedTalents = watch('talents');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [talents, productions, projects] = await Promise.all([
                firestoreApi.getTalents(),
                firestoreApi.getProductions(),
                firestoreApi.getProjects(),
            ]);
            
            talents.sort((a, b) => a.name.localeCompare(b.name));
            reset({ talents });

            const legacyProdTeam = productions.flatMap(p => p.team || []);
            const legacyFinTeam = projects.flatMap(p => p.talents || []);
            const combinedLegacy = [...legacyProdTeam, ...legacyFinTeam];

            const uniqueLegacy = combinedLegacy.filter((member, index, self) =>
                member.name && index === self.findIndex((t) => (
                    t.name === member.name
                ))
            );
            
            const talentsInPool = new Set(talents.map(t => t.name.trim().toLowerCase()));
            const membersToMigrate = uniqueLegacy.filter(m => !talentsInPool.has(m.name.trim().toLowerCase()));

            setLegacyTeamMembers(membersToMigrate);

        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar talentos',
                description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [reset, toast]);


    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, fetchData]);

    const handlePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.[0]) return;
        
        const file = event.target.files[0];
        setValue(`talents.${index}.file`, file, { shouldDirty: true });

        setIsUploading(prev => ({ ...prev, [index]: true }));

        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 512,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);
            const url = await firestoreApi.uploadTalentPhoto(compressedFile);
            
            setValue(`talents.${index}.photoURL`, url, { shouldDirty: true });
            toast({ title: 'Foto enviada com sucesso!' });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro de Upload',
                description: <CopyableError userMessage="Não foi possível enviar a foto." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsUploading(prev => ({ ...prev, [index]: false }));
        }
    };

    async function onSaveTalent(index: number) {
        setIsSaving(prev => ({ ...prev, [index]: true }));
        const talentData = getValues(`talents.${index}`);
        
        const isFormValid = await trigger(`talents.${index}`);
        if (!isFormValid) {
            toast({ variant: 'destructive', title: "Erro de Validação", description: "Por favor, corrija os erros antes de salvar."});
            setIsSaving(prev => ({ ...prev, [index]: false }));
            return;
        }
        
        try {
            await firestoreApi.saveSingleTalent(talentData);
            
            const formKeyPrefix = `talents.${index}` as const;
            Object.keys(talentData).forEach(key => {
                const typedKey = key as keyof typeof talentData;
                setValue(`${formKeyPrefix}.${typedKey}`, talentData[typedKey], { shouldDirty: false });
            });
            
            toast({ title: `${talentData.name} salvo com sucesso! As informações serão atualizadas em todos os projetos.` });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: <CopyableError userMessage="Não foi possível salvar as alterações." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsSaving(prev => ({ ...prev, [index]: false }));
        }
    }
    
    const handleMigration = async () => {
        setIsMigrating(true);
        try {
            await firestoreApi.migrateTeamToTalentPool();
            toast({
                title: 'Migração Concluída!',
                description: 'Todas as equipes dos seus projetos foram adicionadas ao Banco de Talentos.',
            });
            await fetchData();
        } catch (error) {
             const errorTyped = error as { code?: string; message: string };
             toast({
                variant: 'destructive',
                title: 'Erro na Migração',
                description: <CopyableError userMessage="Não foi possível migrar as equipes." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsMigrating(false);
        }
    }
    
    const handleDeleteClick = (talent: Talent, index: number) => {
        const isNew = !dirtyFields.talents?.[index]; // A simple heuristic: if it's not dirty, it must exist in DB. A better way might be needed if logic changes.
        // For a new unsaved item, its ID is a UUID from crypto.randomUUID(). Saved items have Firestore IDs.
        const isTrulyNew = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(talent.id);

        if (isTrulyNew) {
            remove(index);
            toast({ title: "Talento removido." });
        } else {
            setTalentToDelete({ id: talent.id, name: talent.name, isNew: isTrulyNew, index });
        }
    }

    const handleConfirmDelete = async () => {
        if (!talentToDelete) return;
        const { id: firestoreId } = talentToDelete;
        try {
            await firestoreApi.deleteTalent(firestoreId);
            toast({ title: "Talento removido com sucesso!" });
            await fetchData(); // Refresh data after deletion
        } catch (error: any) {
            let userMessage = "Não foi possível excluir o talento.";
            if (error.message === 'TALENT_IN_USE') {
                userMessage = "Este talento não pode ser excluído pois está sendo utilizado em um ou mais projetos. Remova-o dos projetos antes de excluir.";
            }
             toast({
                variant: 'destructive',
                title: 'Erro ao Excluir',
                description: <CopyableError userMessage={userMessage} errorCode={error.message || error.code || 'UNKNOWN_ERROR'} />,
            });
        } finally {
            setTalentToDelete(null);
        }
    };

    const filteredFields = useMemo(() => {
        if (!searchTerm) {
            return fields.map((field, index) => ({ field, originalIndex: index }));
        }
        return fields
            .map((field, index) => ({ field, originalIndex: index }))
            .filter(({ field }) =>
                field.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [searchTerm, fields]);


    const renderTalentCard = (field: any, originalIndex: number) => {
        const talentData = watchedTalents[originalIndex];
        if (!talentData) return null;

        const photoURL = talentData.photoURL;
        const file = talentData.file;
        let previewUrl = photoURL;
        if (file && !photoURL?.startsWith('https://firebasestorage')) {
            previewUrl = URL.createObjectURL(file);
        }
        const hasRestriction = watch(`talents.${originalIndex}.hasDietaryRestriction`);
        const isDirty = !!dirtyFields.talents?.[originalIndex];
        const isCurrentlySaving = isSaving[originalIndex];
        
        return (
            <Accordion type="single" collapsible key={field.id} className="w-full">
                <AccordionItem value={field.id} className="border-b-0">
                    <div className="border rounded-lg bg-card group">
                        <AccordionTrigger className="p-3 hover:no-underline">
                            <div className="flex items-center gap-4 flex-1">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={previewUrl} alt="Foto do talento" className="object-cover" />
                                    <AvatarFallback className="text-xl"><UserIcon /></AvatarFallback>
                                </Avatar>
                                <p className="font-semibold">{talentData.name || "Novo Talento"}</p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mr-2 z-10" onClick={(e) => { e.stopPropagation(); handleDeleteClick(talentData, originalIndex) }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-4 pt-4 border-t">
                                <div className="relative group">
                                    <Avatar className="h-32 w-32 mx-auto mb-4">
                                        <AvatarImage src={previewUrl} alt="Foto do talento" className="object-cover" />
                                        <AvatarFallback className="text-4xl"><UserIcon /></AvatarFallback>
                                    </Avatar>
                                    <label 
                                        htmlFor={`photo-upload-${originalIndex}`}
                                        className="absolute inset-0 mx-auto h-32 w-32 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        {isUploading[originalIndex] ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                                    </label>
                                    <input id={`photo-upload-${originalIndex}`} type="file" className="hidden" accept="image/png, image/jpeg" onChange={(e) => handlePhotoUpload(originalIndex, e)} disabled={isUploading[originalIndex]} />
                                </div>
                                <FormField control={control} name={`talents.${originalIndex}.name`} render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <FormField control={control} name={`talents.${originalIndex}.contact`} render={({ field }) => (<FormItem><FormLabel>Contato (Telefone/Email)</FormLabel><FormControl><Input placeholder="Informação de contato" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                <div className="space-y-3 pt-3 border-t">
                                    <FormField control={control} name={`talents.${originalIndex}.hasDietaryRestriction`} render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal text-sm">Possui restrição alimentar?</FormLabel></FormItem>)}/>
                                    {hasRestriction && (<FormField control={control} name={`talents.${originalIndex}.dietaryRestriction`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Qual restrição/alergia?</FormLabel><FormControl><Input placeholder="ex: Glúten, lactose, amendoim..." {...field} /></FormControl><FormMessage /></FormItem>)}/>)}
                                    <FormField control={control} name={`talents.${originalIndex}.extraNotes`} render={({ field }) => (<FormItem><FormLabel>Observação Extra <span className="text-muted-foreground">(Opcional)</span></FormLabel><FormControl><Textarea placeholder="ex: Medicação específica, necessidade especial..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>)}/>
                                </div>
                                <div className="pt-4 border-t flex justify-end">
                                    <Button type="button" onClick={() => onSaveTalent(originalIndex)} disabled={!isDirty || isCurrentlySaving || isUploading[originalIndex]}>
                                        {isCurrentlySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </div>
                </AccordionItem>
            </Accordion>
        );
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className={cn("flex flex-col sm:max-w-6xl h-full")}>
                <DialogHeader>
                    <DialogTitle>Banco de Talentos</DialogTitle>
                    <DialogDescription>
                        Adicione, remova e edite os contatos da sua equipe. Estes contatos estarão disponíveis para serem selecionados em todos os seus projetos.
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex-1 overflow-y-auto -mr-6 pr-6">
                    <div className="py-4">
                        {isLoading ? (
                            <div className="p-8 space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-64 w-full" />
                            </div>
                        ) : (
                            <Form {...form}>
                                <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="relative flex-grow">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Pesquisar talento por nome..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                        <Button type="button" variant="ghost" onClick={() => prepend({ id: crypto.randomUUID(), name: '', contact: '' })}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Adicionar Talento
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {legacyTeamMembers.length > 0 && (
                                        <Alert variant="default" className="border-amber-500/50 text-amber-900 dark:text-amber-300 [&>svg]:text-amber-500">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Migração de Equipes</AlertTitle>
                                            <AlertDescription className="text-amber-700 dark:text-amber-400">
                                                Encontramos {legacyTeamMembers.length} membro(s) de equipe em seus projetos antigos que ainda não estão no Banco de Talentos. Clique para importá-los.
                                            </AlertDescription>
                                            <Button type="button" onClick={handleMigration} disabled={isMigrating} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white">
                                                {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Migrar Equipes Antigas
                                            </Button>
                                        </Alert>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="flex flex-col gap-4">
                                            {filteredFields
                                                .filter((_, index) => index % 2 === 0)
                                                .map(({ field, originalIndex }) => renderTalentCard(field, originalIndex))}
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            {filteredFields
                                                .filter((_, index) => index % 2 !== 0)
                                                .map(({ field, originalIndex }) => renderTalentCard(field, originalIndex))}
                                        </div>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </div>
                </div>
                 <AlertDialog open={!!talentToDelete} onOpenChange={(open) => !open && setTalentToDelete(null)}>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o talento "{talentToDelete?.name}" do seu Banco de Talentos e o removerá de todos os projetos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                        onClick={handleConfirmDelete}
                        className="bg-destructive hover:bg-destructive/90"
                        >
                        Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    )
}
