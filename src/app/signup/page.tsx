'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

import { auth, storage } from '@/lib/firebase/config';
import * as firestoreApi from '@/lib/firebase/firestore';
import { useAuth } from '@/context/auth-context';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Users, FileSpreadsheet, Camera, User as UserIcon, Clapperboard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CopyableError } from '@/components/copyable-error';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Você deve aceitar os Termos de Uso e Privacidade." }),
  }),
});

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.5 173.5 64.2L337.7 139.6C312.8 118.4 283.5 104 248 104c-80.3 0-145.3 65.8-145.3 146.9s65 146.9 145.3 146.9c95.2 0 130.6-76.3 134-114.3H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
    </svg>
  );

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
      terms: false,
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
      case 'auth/popup-closed-by-user':
        return 'O pop-up de login foi fechado antes da conclusão. Tente novamente.';
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
        title: 'Erro em /signup/page.tsx (onSubmit)',
        description: <CopyableError userMessage={getSignupErrorMessage(error.code)} errorCode={error.code} />,
      });
    } finally {
        setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);

      if (additionalInfo?.isNewUser && user.email) {
        await firestoreApi.createUserProfile(
          user.uid,
          user.displayName || "Novo Usuário",
          user.email,
          user.photoURL
        );
      }
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Criar Conta',
        description: <CopyableError userMessage={getSignupErrorMessage(error.code)} errorCode={error.code} />,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  if (loading || user) {
      return null;
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-8 relative">
        <div className="mx-auto w-full max-w-md space-y-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
                  <rect width="32" height="32" rx="6" fill="hsl(var(--brand-login))"/>
                  <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
              </svg>
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-login))"}}>ProductionFlow</h1>
                <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
              </div>
            </div>
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
                    <h3 className="text-lg font-semibold">Gestão de Equipe Completa</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Cadastre sua equipe, gerencie informações de contato e controle pagamentos de cachês e diárias.
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                    <Clapperboard className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold">Ordem do Dia Detalhada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Crie e gerencie Ordens do Dia (Call Sheets) com horários, cenas, clima e checklists interativos.
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
                        Exporte relatórios financeiros e de produção para Excel e PDF com um clique.
                    </p>
                </div>
            </div>
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
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continuar com o Google
          </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        OU CADASTRE-SE COM EMAIL
                    </span>
                </div>
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
                        disabled={isLoading || isGoogleLoading}
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
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Eu li e aceito os{' '}
                        <Link href="/terms" target="_blank" className="underline hover:text-primary">
                          Termos de Uso e Política de Privacidade
                        </Link>
                        .
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
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
