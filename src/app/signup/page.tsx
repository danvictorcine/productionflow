'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import { auth, storage } from '@/lib/firebase/config';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Users, FileSpreadsheet, Camera, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const getSignupErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está em uso. Tente fazer login ou use um e-mail diferente.';
      case 'auth/invalid-email':
        return 'O formato do e-mail é inválido.';
      case 'auth/weak-password':
        return 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'O cadastro com e-mail e senha não está habilitado. Contate o administrador.';
      default:
        return 'Ocorreu um erro desconhecido. Verifique seus dados ou a configuração do Firebase.';
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;
      
      let photoURL: string | null = null;
      if (photoFile) {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 256,
            useWebWorker: true,
          };
          const compressedFile = await imageCompression(photoFile, options);
          const filePath = `users/${newUser.uid}/profile.jpg`;
          const storageRef = ref(storage, filePath);
          await uploadBytes(storageRef, compressedFile);
          photoURL = await getDownloadURL(storageRef);
      }

      await updateProfile(newUser, { displayName: values.name, photoURL: photoURL });
      await firestoreApi.createUserProfile(newUser.uid, values.name, values.email, photoURL);
      
      toast({
        title: 'Conta Criada!',
        description: 'Você será redirecionado para a página de projetos.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no Cadastro',
        description: getSignupErrorMessage(error.code),
      });
    } finally {
        setIsLoading(false);
    }
  }
  
  if (loading || user) {
      return null;
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-8 relative">
        <div className="mx-auto w-full max-w-md space-y-4">
            <h1 className="text-4xl font-bold text-primary">ProductionFlow</h1>
            <p className="text-lg text-muted-foreground">
                Sua plataforma completa para a gestão financeira de produções audiovisuais.
            </p>
        </div>
        <div className="mt-12 grid gap-8 w-full max-w-md">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <DollarSign className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Orçamento Inteligente</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Controle seu orçamento, despesas e saldo em tempo real, com gráficos claros e detalhados.
                    </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <Users className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Gestão de Equipe Flexível</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Gerencie cachês fixos e pagamentos por diária, garantindo precisão e controle total sobre os custos.
                    </p>
                </div>
            </div>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Relatórios Simplificados</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Exporte relatórios financeiros para Excel com um clique, simplificando a prestação de contas.
                    </p>
                </div>
            </div>
        </div>
        <div className="absolute bottom-8">
            <p className="text-sm text-muted-foreground">
                Um produto: <span className="font-semibold text-foreground">Candeeiro Filmes</span>
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-sm gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Crie sua Conta</h1>
            <p className="text-balance text-muted-foreground">
              Comece a gerenciar seus projetos audiovisuais.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <div className="flex justify-center pb-4">
                <div className="relative group">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={photoPreview || undefined} alt="Avatar Preview" />
                        <AvatarFallback className="text-3xl"><UserIcon /></AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="photo-upload" 
                      className="absolute inset-0 bg-black/40 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Camera className="h-6 w-6" />
                    </label>
                    <input
                        ref={fileInputRef}
                        id="photo-upload"
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg"
                        onChange={handlePhotoChange}
                        disabled={isLoading}
                    />
                </div>
              </div>
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
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
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Conta
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="underline">
              Faça login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
