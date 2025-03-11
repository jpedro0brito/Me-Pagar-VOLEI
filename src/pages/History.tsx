import React, { useState } from 'react';
import MatchHistory from '@/components/MatchHistory';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import PendingPaymentsModal from '@/components/PendingPaymentsModal';
import dbService from '@/utils/dbService';

const History: React.FC = () => {
    const navigate = useNavigate();
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [matches, setMatches] = useState([]);

    const handleNewMatch = () => {
        navigate('/');
    };

    const handleOpenPendingPayments = async () => {
        const loadedMatches = await dbService.getMatches();
        setMatches(loadedMatches);
        setIsPendingModalOpen(true);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1">
                <div className="container py-8 px-4 md:py-12 md:px-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <Button
                                variant="outline"
                                onClick={handleOpenPendingPayments}
                            >
                                <Receipt className="mr-2 h-4 w-4" />
                                Pagamentos Pendentes
                            </Button>
                        </div>
                    </div>

                    <MatchHistory onNewMatch={handleNewMatch} />

                    <PendingPaymentsModal
                        isOpen={isPendingModalOpen}
                        onClose={() => setIsPendingModalOpen(false)}
                        matches={matches}
                    />
                </div>
            </main>
        </div>
    );
};

export default History;
