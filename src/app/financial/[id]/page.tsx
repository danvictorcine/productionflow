// @/src/app/financial/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject } from '@/lib/firebase/firestore';
import { Loader2 } from 'lucide-react';

// Esta página agora atua como um redirecionador de compatibilidade.
// O nome da pasta é "financial" para corresponder à nova estrutura de abas,
// embora a rota antiga fosse "/project/[id]".
export default function LegacyFinancialRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const financialId = params.id as string;

    useEffect(() => {
        if (financialId) {
            getProject(financialId).then(project => {
                if (project?.unifiedProjectId) {
                    // Se o projeto legado tem um ID unificado, redireciona para a nova rota.
                    router.replace(`/project/${project.unifiedProjectId}/financial`);
                } else {
                    // Se não, redireciona para a home. A migração será tratada lá.
                    router.replace('/');
                }
            });
        }
    }, [financialId, router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecionando para o novo layout do projeto...</p>
        </div>
    );
}
