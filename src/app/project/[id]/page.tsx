// @/src/app/project/[id]/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Esta página agora atua como um redirecionador para a aba padrão (financeiro).
export default function ProjectRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    useEffect(() => {
        if (projectId) {
            router.replace(`/project/${projectId}/financial`);
        }
    }, [projectId, router]);

    return null; // Renderiza nada enquanto redireciona
}
