// @/src/app/storyboard/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStoryboard } from '@/lib/firebase/firestore';
import { Loader2 } from 'lucide-react';

// Esta página agora atua como um redirecionador de compatibilidade.
export default function LegacyStoryboardRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const storyboardId = params.id as string;

    useEffect(() => {
        if (storyboardId) {
            getStoryboard(storyboardId).then(storyboard => {
                if (storyboard?.unifiedProjectId) {
                    // Se o projeto legado tem um ID unificado, redireciona para a nova rota.
                    router.replace(`/project/${storyboard.unifiedProjectId}/storyboard`);
                } else {
                    // Se não, redireciona para a home. A migração será tratada lá.
                    router.replace('/');
                }
            });
        }
    }, [storyboardId, router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecionando para o novo layout do projeto...</p>
        </div>
    );
}
