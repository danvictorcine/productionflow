// @/src/components/public-page-view.tsx
import type { UserProfile } from "@/lib/types";
import { PublicPageHeader } from "./public-page-header";
import { AppFooter } from "./app-footer";

interface PublicPageViewProps {
  creator: UserProfile | null;
  children: React.ReactNode;
}

export function PublicPageView({ creator, children }: PublicPageViewProps) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <PublicPageHeader creator={creator} />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
