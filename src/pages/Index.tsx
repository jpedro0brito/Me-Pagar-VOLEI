import React from 'react';
import NewMatch from '@/components/NewMatch';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';

const Index: React.FC = () => {
    const navigate = useNavigate();

    const handleNewMatch = () => {
        navigate('/history');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1">
                <div className="container py-8 px-4 md:py-12 md:px-6">
                    <NewMatch />
                </div>
            </main>
        </div>
    );
};

export default Index;
