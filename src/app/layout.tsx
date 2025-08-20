
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import ThemeLoader from '@/components/theme-loader';


export const metadata: Metadata = {
  title: 'ProductionFlow',
  description: 'Gerenciamento financeiro para produções audiovisuais.',
  icons: {
    icon: "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 171 131'%3e%3cg fill='%233F51B5'%3e%3cpath d='M160.3 51L87.2 11.1c-3.3-1.8-6.6-2.7-9.7-2.7-8.8 0-14.7 6.9-14.7 17.2v78.1c0 10.3 5.9 17.2 14.7 17.2 3.1 0 6.4-.9 9.7-2.7l73.1-39.9c6.1-3.3 9.6-8.3 9.6-13.6s-3.5-10.3-9.6-13.6zm-4.6 18.7L82.5 109.6c-1.8 1-3.6 1.5-5 1.5-4.4 0-4.9-5.2-4.9-7.4V25.6c0-2.2.5-7.4 4.9-7.4 1.5 0 3.2.5 5 1.5l73.1 39.9c2.8 1.5 4.5 3.4 4.5 5s-1.7 3.5-4.5 5.1z'/%3e%3cpath d='M112.5 49L28.4 3.1C24.6 1 20.9 0 17.3 0 7.2 0 .4 7.9.4 19.7v90c0 11.8 6.8 19.7 16.9 19.7 3.6 0 7.4-1.1 11.1-3.1L112.5 80.3c7-3.8 11.1-9.5 11.1-15.7s-4.1-11.8-11.1-15.7zm-5.4 21.5L23.1 116.3c-2.1 1.1-4.1 1.7-5.8 1.7-5.1 0-5.6-6-5.6-8.6V19.7c0-2.6.5-8.5 5.6-8.5 1.7 0 3.7.6 5.8 1.8l84.1 45.8c3.3 1.8 5.2 4 5.2 5.9s-1.9 4.1-5.2 5.8z'/%3e%3c/g%3e%3c/svg%3e"
  }
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeLoader />
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
