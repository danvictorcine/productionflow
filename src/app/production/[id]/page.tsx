// @/src/app/production/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProduction } from '@/lib/firebase/firestore';
import { Loader2 } from 'lucide-react';

// Esta página agora atua como um redirecionador de compatibilidade.
export default function LegacyProductionRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const productionId = params.id as string;

    useEffect(() => {
        if (productionId) {
            getProduction(productionId).then(production => {
                if (production?.unifiedProjectId) {
                    // Se o projeto legado tem um ID unificado, redireciona para a nova rota.
                    router.replace(`/project/${production.unifiedProjectId}/production`);
                } else {
                    // Se não (caso muito raro ou de acesso direto), redireciona para a home para evitar erros.
                    // A migração será tratada na página principal.
                    router.replace('/');
                }
            });
        }
    }, [productionId, router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecionando para o novo layout do projeto...</p>
        </div>
    );
}
