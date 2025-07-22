// @/src/app/public/storyboard/[publicId]/page.tsx

import Image from 'next/image';
import { notFound } from 'next/navigation';
import * as firestoreApi from '@/lib/firebase/firestore';
import { AppFooter } from '@/components/app-footer';
import { PublicPageHeader } from '@/components/public-page-header';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';


interface PublicStoryboardPageProps {
  params: {
    publicId: string;
  };
}

export default async function PublicStoryboardPage({ params }: PublicStoryboardPageProps) {
    const data = await firestoreApi.getPublicStoryboard(params.publicId);

    if (!data) {
        return notFound();
    }

    const { storyboard, panels } = data;
    
    // Create a mock creator profile from the data stored on the storyboard document
    const creatorProfile = {
      uid: storyboard.userId,
      name: storyboard.creatorName || 'Criador Anônimo',
      email: '', // Not needed for public view
      photoURL: storyboard.creatorPhotoURL || '',
    };

    return (
        <div className="flex flex-col min-h-screen w-full bg-muted/40">
            <PublicPageHeader creator={creatorProfile} />
            <main className="flex-1 p-4 sm:p-6 md:p-8">
                <div className="mb-6">
                    <Card>
                        <CardContent className="p-4 space-y-1">
                            <CardTitle>{storyboard.name}</CardTitle>
                            {storyboard.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {storyboard.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                {panels.length > 0 ? (
                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                        {panels.map((panel, index) => (
                             <div key={panel.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm break-inside-avoid">
                                <div
                                    className={cn(
                                        "relative w-full rounded-md overflow-hidden bg-muted",
                                        storyboard.aspectRatio === '16:9' ? "aspect-video" : "aspect-[4/3]"
                                    )}
                                >
                                    <Image src={panel.imageUrl} alt={`Storyboard panel ${index + 1}`} layout="fill" objectFit="cover" />
                                    <div className="absolute top-1 left-1 bg-black/50 text-white text-xs font-bold px-1.5 py-0.5 rounded-sm pointer-events-none">
                                        {index + 1}
                                    </div>
                                </div>
                                {panel.notes && (
                                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{panel.notes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-16">
                        Este storyboard ainda não tem quadros.
                    </div>
                )}
            </main>
            <AppFooter />
        </div>
    );
}
