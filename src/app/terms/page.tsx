
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProductionFlowIcon } from '@/components/production-flow-icon';

export default function TermsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackContent = `
    <h2>Termos de Uso e Política de Privacidade</h2>
    <p>Bem-vindo ao ProductionFlow. Ao utilizar nosso aplicativo, você concorda com estes Termos de Uso e nossa Política de Privacidade.</p>
    <h3>1. Aceitação dos Termos</h3>
    <p>Ao criar uma conta e utilizar o ProductionFlow, você confirma que leu, entendeu e concorda em estar vinculado a estes termos. Se você não concordar, não utilize o serviço.</p>
    <h3>2. Versão Beta e Limitação de Responsabilidade</h3>
    <p><strong>O ProductionFlow está atualmente em fase de testes (Beta).</strong> Isso significa que a plataforma está em desenvolvimento contínuo e pode apresentar instabilidades, bugs ou funcionalidades incompletas. Ao utilizar a versão Beta, você reconhece e concorda que:</p>
    <ul>
        <li>O serviço é fornecido "como está", sem garantias de qualquer tipo, expressas ou implícitas.</li>
        <li><strong>Não nos responsabilizamos por qualquer perda de dados, informações ou projetos.</strong> Recomendamos que você mantenha backups de segurança de todas as informações importantes inseridas na plataforma.</li>
        <li>Funcionalidades podem ser adicionadas, modificadas ou removidas sem aviso prévio.</li>
    </ul>
    <h3>3. Descrição do Serviço</h3>
    <p>O ProductionFlow é uma plataforma projetada para auxiliar profissionais do audiovisual no gerenciamento financeiro e de produção de seus projetos. As funcionalidades incluem, mas não se limitam a, controle de orçamento, rastreamento de despesas, criação de ordens do dia e gestão de equipes.</p>
    <h3>4. Privacidade e Proteção de Dados (LGPD)</h3>
    <p>Levamos sua privacidade a sério e estamos comprometidos em proteger seus dados em conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil.</p>
    <ul>
      <li><strong>Coleta de Dados:</strong> Coletamos apenas os dados essenciais para o funcionamento do aplicativo, como seu nome, e-mail e as informações dos projetos que você insere (orçamentos, despesas, detalhes de produção, etc.).</li>
      <li><strong>Uso dos Dados:</strong> Seus dados são utilizados exclusivamente para fornecer, manter e melhorar os serviços do ProductionFlow. Não utilizamos suas informações para fins de marketing de terceiros. As informações são armazenadas de forma segura nos servidores do Firebase (Google Cloud).</li>
      <li><strong>Não Compartilhamento:</strong> Nós não vendemos, alugamos ou compartilhamos suas informações pessoais ou os dados de seus projetos com terceiros.</li>
      <li><strong>Responsabilidade do Usuário:</strong> Você é o único responsável legal por todos os dados e conteúdos que insere na plataforma, incluindo textos, roteiros e imagens.</li>
    </ul>
    <h3>5. Contas de Usuário e Segurança</h3>
    <p>Você é responsável por manter a confidencialidade de sua senha e conta e por todas as atividades que ocorrem sob sua conta. O ProductionFlow não se responsabiliza por perdas ou danos decorrentes do seu descumprimento desta obrigação de segurança.</p>
    <h3>6. Modificações nos Termos</h3>
    <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre alterações significativas. O uso contínuo do serviço após tais alterações constitui sua aceitação dos novos termos.</p>
    <h3>7. Contato</h3>
    <p>Se você tiver alguma dúvida sobre estes termos, entre em contato conosco através da nossa página de <a href="/contact" class="text-primary hover:underline">Contato</a>.</p>
  `;

  useEffect(() => {
    firestoreApi.getPage('terms')
      .then(content => {
        if (content) {
          setPageContent(content);
        } else {
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
  }, [toast]);

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
            <ProductionFlowIcon className="h-7 w-7" />
            <p className="text-lg font-semibold tracking-tighter" style={{color: "hsl(var(--brand-text))"}}>ProductionFlow</p>
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
