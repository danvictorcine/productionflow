'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppFooter } from '@/components/app-footer';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import * as firestoreApi from '@/lib/firebase/firestore';
import type { PageContent } from '@/lib/types';
import { CopyableError } from '@/components/copyable-error';

export default function TermsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackContent = `
    <h2>Termos de Uso e Política de Privacidade</h2>
    <p class="text-muted-foreground">Última atualização: ${new Date().toLocaleDateString('pt-BR')}</p>
    <p>Bem-vindo ao ProductionFlow. Ao utilizar nosso aplicativo, você concorda com estes Termos de Uso e nossa Política de Privacidade.</p>
    
    <h3>1. Aceitação dos Termos</h3>
    <p>Ao criar uma conta e utilizar o ProductionFlow, você confirma que leu, entendeu e concorda em estar vinculado a estes termos. Se você não concordar, não utilize o serviço.</p>
    
    <h3>2. Descrição do Serviço</h3>
    <p>O ProductionFlow é uma plataforma projetada para auxiliar profissionais do audiovisual no gerenciamento financeiro e de produção de seus projetos. As funcionalidades incluem, mas não se limitam a, controle de orçamento, rastreamento de despesas, criação de ordens do dia e gestão de equipes.</p>

    <h3>3. Contas de Usuário e Segurança</h3>
    <p>Você é responsável por manter a confidencialidade de sua senha e conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta. O ProductionFlow não se responsabiliza por perdas ou danos decorrentes do seu descumprimento desta obrigação de segurança.</p>
    
    <h3>4. Responsabilidade pelo Conteúdo do Usuário</h3>
    <p><strong>Você é o único responsável por todos os dados, informações, textos, roteiros, imagens e outros materiais ("Conteúdo") que você cadastra, envia por upload, ou insere na plataforma.</strong> Isso inclui, mas não se limita a, informações financeiras, dados de projetos, e qualquer arquivo de mídia.</p>
    <p>Ao fazer o upload de imagens ou qualquer outro conteúdo, você declara e garante que possui todos os direitos necessários (incluindo direitos autorais) para usar, armazenar e exibir esse conteúdo no ProductionFlow. O aplicativo atua como uma plataforma para hospedar seu conteúdo, e a responsabilidade legal sobre ele é inteiramente sua.</p>

    <h3>5. Política de Privacidade e Conformidade com a LGPD</h3>
    <p>Nós levamos sua privacidade a sério e estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil.</p>
    <ul>
      <li><strong>Coleta de Dados:</strong> Coletamos apenas os dados necessários para o funcionamento do aplicativo, como seu nome, e-mail e os dados dos projetos que você insere.</li>
      <li><strong>Uso dos Dados:</strong> Seus dados são utilizados exclusivamente para fornecer e melhorar os serviços do ProductionFlow. As informações são armazenadas de forma segura nos servidores do Firebase (Google Cloud).</li>
      <li><strong>Não Compartilhamento:</strong> Nós não vendemos, alugamos ou compartilhamos suas informações pessoais ou os dados de seus projetos com terceiros para fins de marketing ou qualquer outro fim não relacionado diretamente ao funcionamento do aplicativo.</li>
    </ul>

    <h3>6. Limitação de Responsabilidade</h3>
    <p>O ProductionFlow é fornecido "como está", sem garantias de qualquer tipo. Em nenhuma circunstância seremos responsáveis por quaisquer danos diretos ou indiretos resultantes do uso ou da incapacidade de usar o serviço.</p>

    <h3>7. Modificações nos Termos</h3>
    <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre alterações significativas. O uso contínuo do serviço após tais alterações constitui sua aceitação dos novos termos.</p>

    <h3>8. Contato</h3>
    <p>Se você tiver alguma dúvida sobre estes termos, entre em contato conosco através da nossa página de <a href="/contact" class="text-primary hover:underline">Contato</a>.</p>
  `;

  useEffect(() => {
    firestoreApi.getPage('terms')
      .then(content => {
        if (content) {
          setPageContent(content);
        } else {
          // Fallback content if nothing is in the database yet
          setPageContent({
            id: 'terms',
            title: 'Termos e Privacidade',
            content: fallbackContent,
            updatedAt: new Date(),
          });
        }
      })
      .catch(error => {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: 'destructive',
            title: 'Erro em /terms/page.tsx',
            description: <CopyableError userMessage="Não foi possível carregar o conteúdo da página." errorCode={errorTyped.code || errorTyped.message} />,
        });
      })
      .finally(() => setIsLoading(false));
  }, [toast, fallbackContent]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Voltar">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Termos e Privacidade</h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <rect width="32" height="32" rx="6" fill="hsl(var(--primary))"/>
              <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))"/>
            </svg>
            <p className="text-lg font-semibold text-primary tracking-tighter">ProductionFlow</p>
            <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
          </div>
          {user && <UserNav />}
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/6" />
            </div>
          ) : pageContent ? (
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: pageContent.content }}
            />
          ) : (
            <p>Conteúdo não encontrado.</p>
          )}
      </main>
      <AppFooter />
    </>
  );
}
