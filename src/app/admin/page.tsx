
'use client';

import Link from 'next/link';
import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Newspaper, Palette, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function AdminDashboard() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/" className="flex items-center gap-2" aria-label="Voltar">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                </Link>
                <h1 className="text-xl font-bold">Painel de Administração</h1>
                <div className="ml-auto flex items-center gap-4">
                <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid gap-6 md:grid-cols-2">
                    <Link href="/admin/blog" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Newspaper className="h-5 w-5 text-primary"/>
                                    Gerenciar Blog
                                </CardTitle>
                                <CardDescription>Crie, edite e exclua publicações do blog.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button>Acessar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                     <Link href="/admin/pages" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full flex flex-col justify-between">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary"/>
                                    Gerenciar Páginas e Conteúdo
                                </CardTitle>
                                <CardDescription>Edite o conteúdo das páginas, equipe e página de login.</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <Button>Acessar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/theme" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-primary"/>
                                    Gerenciar Tema do Aplicativo
                                </CardTitle>
                                <CardDescription>Personalize as cores de todo o aplicativo, como botões, fundos e textos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button>Acessar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                     <Link href="/admin/limits" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-primary"/>
                                    Gerenciar Limites (Beta)
                                </CardTitle>
                                <CardDescription>Defina os limites de uso para os usuários na versão Beta.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button>Acessar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </main>
            <AppFooter />
        </div>
    )
}
