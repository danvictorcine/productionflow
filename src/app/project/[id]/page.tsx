// @/src/app/project/[id]/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// This page now acts as a redirector to the default financial tab.
export default function ProjectRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    useEffect(() => {
        if (projectId) {
            router.replace(`/project/${projectId}/financial`);
        }
    }, [projectId, router]);

    return null; // Render nothing while redirecting
}
