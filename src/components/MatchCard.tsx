import React from 'react';
import { Calendar, Clock, DollarSign, Users, Trash2 } from 'lucide-react';
import { Match, getPaymentProgress } from '@/utils/calculations';
import { cn } from '@/lib/utils';
import ProgressBar from './ProgressBar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface MatchCardProps {
    match: Match;
    onClick: () => void;
    onDelete: (id: string) => Promise<void>;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onClick, onDelete }) => {
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const { toast } = useToast();

    const progress = getPaymentProgress(match);
    const matchDate = new Date(match.date);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            await onDelete(match.id);
            toast({
                title: "Partida excluída",
                description: "A partida foi excluída com sucesso."
            });
            setDeleteDialogOpen(false);
        } catch (error) {
            console.error('Error deleting match:', error);
            toast({
                title: "Erro ao excluir partida",
                description: "Ocorreu um erro ao excluir a partida. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const statusChip = match.status === 'complete' ? (
        <span className="badge-complete">Concluído</span>
    ) : (
        <span className="badge-pending">Pendente</span>
    );

    return (
        <>
            <div
                className={cn(
                    "card-hover group cursor-pointer",
                    "animate-fade-in"
                )}
                onClick={onClick}
            >
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 icon-button text-destructive/70 hover:text-destructive transition-opacity"
                    aria-label="Excluir partida"
                >
                    <Trash2 size={18} />
                </button>

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="text-xl font-semibold">Partida de Vôlei</div>
                        {statusChip}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={16} />
                        <span>{formatDate(matchDate)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={16} />
                        <span>{formatTime(matchDate)} • {match.totalHours}h</span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign size={16} />
                        <span>R$ {match.courtCost.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={16} />
                        <span>{match.players.length} jogadores</span>
                    </div>
                </div>

                <ProgressBar
                    value={progress}
                    className="mt-auto"
                />

                {match.status === 'complete' && match.completionDate && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Concluído em: {new Date(match.completionDate).toLocaleString('pt-BR')}
                    </div>
                )}
            </div>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Excluir partida</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir esta partida? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex justify-end gap-2 sm:justify-end">
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MatchCard;
