'use client';

import Link from 'next/link';
import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Newspaper } from 'lucide-react';
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
                     <Card className="bg-muted cursor-not-allowed h-full flex flex-col justify-between">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-muted-foreground">
                                <BookOpen className="h-5 w-5"/>
                                Gerenciar Páginas
                            </CardTitle>
                            <CardDescription>Edite o conteúdo das páginas "Quem Somos", "Contato" e da página de login. (Em breve)</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <Button disabled>Acessar</Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <AppFooter />
        </div>
    )
}
