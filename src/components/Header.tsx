import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Header: React.FC = () => {
    const location = useLocation();

    return (
        <header className="sticky top-0 z-40 w-full backdrop-blur-sm bg-white/90 border-b border-border/40 animate-fade-in">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link
                        to="/"
                        className="text-xl font-semibold tracking-tight transition-colors hover:text-primary"
                    >
                        Me Pagar | VOLEI
                    </Link>
                </div>

                <nav className="flex items-center gap-6">
                    <Link
                        to="/"
                        className={cn(
                            "text-sm font-medium transition-colors focus-ring px-3 py-2 rounded-md",
                            location.pathname === '/' ?
                                "bg-accent text-accent-foreground" :
                                "hover:bg-muted"
                        )}
                    >
                        Nova Partida
                    </Link>
                    <Link
                        to="/history"
                        className={cn(
                            "text-sm font-medium transition-colors focus-ring px-3 py-2 rounded-md",
                            location.pathname === '/history' ?
                                "bg-accent text-accent-foreground" :
                                "hover:bg-muted"
                        )}
                    >
                        Histórico
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;
