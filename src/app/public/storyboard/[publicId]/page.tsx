// @/src/app/public/storyboard/[publicId]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPublicStoryboard } from '@/lib/firebase/firestore';
import { PublicPageView } from '@/components/public-page-view';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';


type PublicStoryboardPageProps = {
  params: {
    publicId: string;
  };
};

export default async function PublicStoryboardPage({ params }: PublicStoryboardPageProps) {
  const result = await getPublicStoryboard(params.publicId);

  if (!result) {
    notFound();
  }

  const { storyboard, panels, creator } = result;

  return (
    <PublicPageView creator={creator}>
       <div className="space-y-6">
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
                            <div className="text-sm bg-muted/50 p-2 rounded-md whitespace-pre-wrap">{panel.notes}</div>
                          )}
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center py-16 text-muted-foreground">
                  <p>Este storyboard ainda não tem nenhum quadro.</p>
              </div>
          )}
      </div>
    </PublicPageView>
  );
}
