'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Camera, User as UserIcon, Upload, Download } from 'lucide-react';
import imageCompression from 'browser-image-compression';

import AuthGuard from '@/components/auth-guard';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserNav } from '@/components/user-nav';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email(),
});


function SettingsPageDetail() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, form]);

  const handleUpdateName = async (values: z.infer<typeof formSchema>) => {
    if (!user || user.name === values.name) return;
    setIsSaving(true);
    try {
      await firestoreApi.updateUserProfile(user.uid, { name: values.name });
      await refreshUser();
      toast({ title: 'Sucesso!', description: 'Seu nome foi atualizado.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsSendingEmail(true);
    try {
      await firestoreApi.sendPasswordReset(user.email);
      toast({ title: 'E-mail Enviado', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    
    setIsUploading(true);

    setTimeout(() => {
      const processImage = async () => {
        try {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 256,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(file, options);
          await firestoreApi.uploadProfilePhoto(user.uid, compressedFile);
          await refreshUser();
          toast({ title: 'Foto atualizada!', description: 'Sua nova foto de perfil foi salva.' });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Erro no Upload', description: error.message });
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      
      processImage().catch(error => {
        toast({ variant: 'destructive', title: 'Erro Inesperado', description: (error as Error).message });
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      });
    }, 0);
  };
  
  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleExportData = async () => {
    setIsExporting(true);
    try {
        const projects = await firestoreApi.getProjects();
        const allTransactions = [];

        for (const project of projects) {
            const transactions = await firestoreApi.getTransactions(project.id);
            allTransactions.push(...transactions);
        }
        
        const dataToExport = { projects, transactions: allTransactions };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `productionflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({ title: "Exportação Concluída", description: "Seus dados foram baixados com sucesso." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro na Exportação', description: error.message });
    } finally {
        setIsExporting(false);
    }
  };

  const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          if (file.type !== 'application/json') {
              toast({ variant: 'destructive', title: 'Arquivo Inválido', description: 'Por favor, selecione um arquivo .json válido.' });
              return;
          }
          setFileToImport(file);
      }
  };

  const handleConfirmImport = async () => {
    if (!fileToImport) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                throw new Error("Não foi possível ler o arquivo.");
            }
            const data = JSON.parse(text);

            if (!data.projects || !data.transactions || !Array.isArray(data.projects) || !Array.isArray(data.transactions)) {
                throw new Error("O arquivo de importação não tem o formato esperado.");
            }

            await firestoreApi.importData(data);
            
            toast({ title: 'Importação Concluída!', description: 'Seus dados foram importados com sucesso. Redirecionando...' });
            router.push('/');

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Erro na Importação', description: error.message });
        } finally {
             setIsImporting(false);
             setFileToImport(null);
             if(importFileInputRef.current) {
                importFileInputRef.current.value = "";
             }
        }
    };

    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao ler o arquivo selecionado.' });
        setIsImporting(false);
        setFileToImport(null);
    };
    
    reader.readAsText(fileToImport);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
       <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Projetos</span>
            </Button>
        </Link>
        <h1 className="text-xl font-bold">Configurações da Conta</h1>
        <div className="ml-auto flex items-center gap-4">
          <p className="text-lg font-semibold text-primary">ProductionFlow</p>
          <UserNav />
        </div>
      </header>
       <main className="flex-1 p-4 sm:p-6 md:p-8 flex justify-center items-start">
        <Card className="w-full max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateName)}>
              <CardHeader>
                <CardTitle>Perfil e Segurança</CardTitle>
                <CardDescription>Gerencie as informações da sua conta e senha.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={user?.photoURL || undefined} alt={user?.name || 'Avatar'} className="object-cover" />
                          <AvatarFallback className="text-3xl">
                            {user?.name ? getInitials(user.name) : <UserIcon />}
                          </AvatarFallback>
                        </Avatar>
                        <label 
                          htmlFor="photo-upload" 
                          className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          {isUploading ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                              <Camera className="h-6 w-6" />
                          )}
                        </label>
                        <input
                            ref={fileInputRef}
                            id="photo-upload"
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg"
                            onChange={handlePhotoUpload}
                            disabled={isUploading}
                        />
                    </div>
                    <div className="space-y-4 flex-1 w-full">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input readOnly disabled {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                </div>
                 <Button type="submit" disabled={isSaving || isUploading}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações no Perfil
                 </Button>
                 
                 <Separator />

                 <div className="space-y-4">
                    <FormLabel>Senha</FormLabel>
                     <p className="text-sm text-muted-foreground">
                        Para alterar sua senha, enviaremos um link de redefinição para seu e-mail.
                    </p>
                    <Button type="button" variant="outline" onClick={handlePasswordReset} disabled={isSendingEmail}>
                        {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar e-mail para alterar senha
                    </Button>
                 </div>

                 <Separator />

                 <div className="space-y-4">
                    <FormLabel>Gerenciamento de Dados</FormLabel>
                    <Alert>
                        <AlertTitle>Backup e Migração</AlertTitle>
                        <AlertDescription>
                            Exporte todos os seus projetos e transações para um arquivo de backup (.json). Use este arquivo para migrar seus dados. A importação adicionará os dados à conta atual; projetos com nomes duplicados serão renomeados (ex: "Meu Projeto (2)").
                        </AlertDescription>
                    </Alert>
                    <div className="flex gap-4">
                        <Button type="button" variant="outline" onClick={handleExportData} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Exportar Dados
                        </Button>
                        <Button type="button" variant="outline" onClick={() => importFileInputRef.current?.click()} disabled={isImporting}>
                            <Upload className="mr-2 h-4 w-4" />
                            Importar Dados
                        </Button>
                        <input
                            ref={importFileInputRef}
                            id="import-file-upload"
                            type="file"
                            className="hidden"
                            accept="application/json"
                            onChange={handleImportFileSelect}
                            disabled={isImporting}
                        />
                    </div>
                </div>
              </CardContent>
            </form>
          </Form>
        </Card>
       </main>
       <AlertDialog open={!!fileToImport} onOpenChange={(open) => { if (!open) { setFileToImport(null); if (importFileInputRef.current) importFileInputRef.current.value = ""; }}}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Importação de Dados?</AlertDialogTitle>
                <AlertDialogDescription>
                    Você está prestes a importar dados do arquivo <span className="font-semibold">{fileToImport?.name}</span>. 
                    Esta ação adicionará todos os projetos e transações contidos no arquivo à sua conta atual. Projetos com nomes existentes serão renomeados.
                    Esta ação não pode ser desfeita. Deseja continuar?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { if (importFileInputRef.current) { importFileInputRef.current.value = ""; } }}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                >
                    {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar e Importar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SettingsPage() {
    return (
        <AuthGuard>
            <SettingsPageDetail />
        </AuthGuard>
    )
}
