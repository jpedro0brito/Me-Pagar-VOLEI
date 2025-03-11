import React, { useState, useEffect } from 'react';
import { Match, Player } from '@/utils/calculations';
import MatchCard from './MatchCard';
import MatchDetails from './MatchDetails';
import dbService from '@/utils/dbService';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Loader2 } from 'lucide-react';

interface MatchHistoryProps {
    onNewMatch: () => void;
}

type FilterOption = 'all' | 'pending' | 'complete' | 'unpaidByPlayer';

const MatchHistory: React.FC<MatchHistoryProps> = ({ onNewMatch }) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [filterOption, setFilterOption] = useState<FilterOption>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [playerIdFilter, setPlayerIdFilter] = useState<string | undefined>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        loadMatches();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filterOption, searchTerm, matches, playerIdFilter]);

    const loadMatches = async () => {
        setIsLoading(true);
        try {
            const loadedMatches = await dbService.getMatches();
            setMatches(loadedMatches);
        } catch (error) {
            console.error('Error loading matches:', error);
            toast({
                title: "Erro ao carregar partidas",
                description: "Não foi possível carregar o histórico de partidas.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilters = async () => {
        setIsLoading(true);
        try {
            let filtered: Match[];

            if (filterOption === 'unpaidByPlayer') {
                filtered = await dbService.getFilteredMatches(filterOption, playerIdFilter);
            } else {
                filtered = await dbService.getFilteredMatches(filterOption);
            }

            if (searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase();
                filtered = filtered.filter(match => {
                    const matchDate = new Date(match.date).toLocaleDateString('pt-BR');

                    const hasPlayerMatch = match.players.some(
                        player => player.name.toLowerCase().includes(searchLower)
                    );

                    return matchDate.includes(searchLower) ||
                        match.courtCost.toString().includes(searchLower) ||
                        hasPlayerMatch;
                });
            }

            setFilteredMatches(filtered);
        } catch (error) {
            console.error('Error applying filters:', error);
            toast({
                title: "Erro ao filtrar partidas",
                description: "Ocorreu um erro ao aplicar os filtros.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMatchClick = (match: Match) => {
        setSelectedMatch(match);
        setIsDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setIsDetailsOpen(false);
        setSelectedMatch(null);
    };

    const handleUpdatePlayerPayment = async (
        matchId: string,
        playerId: string,
        paid: boolean,
        receiptUrl?: string
    ): Promise<void> => {
        try {
            const updatedMatch = await dbService.updatePlayerPayment(
                matchId,
                playerId,
                paid,
                receiptUrl
            );

            setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));

            if (selectedMatch && selectedMatch.id === matchId) {
                setSelectedMatch(updatedMatch);
            }
        } catch (error) {
            console.error('Error updating player payment:', error);
            throw error;
        }
    };

    const handleDeleteMatch = async (id: string): Promise<void> => {
        try {
            await dbService.deleteMatch(id);
            setMatches(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting match:', error);
            throw error;
        }
    };

    const getPlayerSelectOptions = () => {
        const players: Player[] = [];
        const playerIds = new Set<string>();

        matches.forEach(match => {
            match.players.forEach(player => {
                if (!playerIds.has(player.id) && player.name) {
                    playerIds.add(player.id);
                    players.push(player);
                }
            });
        });

        return players.sort((a, b) => a.name.localeCompare(b.name));
    };

    const uniquePlayers = getPlayerSelectOptions();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="section-title">Histórico de Partidas</h2>
                    <p className="section-subtitle">Gerencie e acompanhe os pagamentos das partidas anteriores</p>
                </div>

                <Button onClick={onNewMatch}>Nova Partida</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Buscar por nome, data..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select
                    value={filterOption}
                    onValueChange={(value) => setFilterOption(value as FilterOption)}
                >
                    <SelectTrigger>
                        <div className="flex items-center gap-2">
                            <Filter size={16} />
                            <SelectValue placeholder="Filtrar por status" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as partidas</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="complete">Concluídas</SelectItem>
                        <SelectItem value="unpaidByPlayer">Não pagas por jogador</SelectItem>
                    </SelectContent>
                </Select>

                {filterOption === 'unpaidByPlayer' && (
                    <Select
                        value={playerIdFilter}
                        onValueChange={setPlayerIdFilter}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um jogador" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniquePlayers.map(player => (
                                <SelectItem key={player.id} value={player.id}>
                                    {player.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMatches.map((match) => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            onClick={() => handleMatchClick(match)}
                            onDelete={handleDeleteMatch}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">Nenhuma partida encontrada</p>
                    <Button
                        variant="outline"
                        onClick={onNewMatch}
                        className="mt-4"
                    >
                        Criar Nova Partida
                    </Button>
                </div>
            )}

            {selectedMatch && (
                <MatchDetails
                    match={selectedMatch}
                    isOpen={isDetailsOpen}
                    onClose={handleCloseDetails}
                    onUpdatePlayerPayment={handleUpdatePlayerPayment}
                />
            )}
        </div>
    );
};

export default MatchHistory;
