'use client';

import Link from 'next/link';
import { AppFooter } from '@/components/app-footer';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookUser, FileSignature, LogIn, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ManagePagesDashboard() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
                <Link href="/admin" className="flex items-center gap-2" aria-label="Voltar para o Painel">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-xl font-bold">Gerenciar Páginas</h1>
                <div className="ml-auto flex items-center gap-4">
                    <UserNav />
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid gap-6 md:grid-cols-2">
                    <Link href="/admin/pages/edit/about" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BookUser className="h-5 w-5 text-primary"/>
                                    Página "Quem Somos"
                                </CardTitle>
                                <CardDescription>Edite o conteúdo e a equipe da página.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button>Editar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/pages/edit/contact" className="block">
                         <Card className="hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSignature className="h-5 w-5 text-primary"/>
                                    Página "Contato"
                                </CardTitle>
                                <CardDescription>Altere as informações de contato exibidas.</CardDescription>
                            </CardHeader>
                             <CardContent>
                                <Button>Editar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/pages/edit/login" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full flex flex-col justify-between">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <LogIn className="h-5 w-5 text-primary"/>
                                    Página de Login
                                </CardTitle>
                                <CardDescription>Edite os cards de features da página de login.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button>Editar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/admin/pages/edit/terms" className="block">
                        <Card className="hover:bg-muted/50 transition-colors h-full flex flex-col justify-between">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Shield className="h-5 w-5 text-primary"/>
                                    Termos e Privacidade
                                </CardTitle>
                                <CardDescription>Edite o conteúdo da página de Termos de Uso.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button>Editar</Button>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </main>
            <AppFooter />
        </div>
    )
}
