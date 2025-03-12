import { Match, Player, updateMatchStatus } from './calculations';
import { toast } from "@/hooks/use-toast";
import { createClient } from '@supabase/supabase-js';


// Use suas variáveis de ambiente ou defina diretamente (não recomendado)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria o cliente
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Converte as linhas do Supabase (matches e players) 
 * em um objeto Match com um array `players`.
 */
async function loadAllMatches(): Promise<Match[]> {
    // 1) Busca todas as partidas
    const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*');

    if (matchesError) {
        console.error('Erro ao buscar matches:', matchesError);
        toast?.({
            title: "Erro",
            description: "Falha ao buscar partidas",
            variant: "destructive"
        });
        return [];
    }

    // 2) Busca todos os jogadores
    const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*');

    if (playersError) {
        console.error('Erro ao buscar players:', playersError);
        toast?.({
            title: "Erro",
            description: "Falha ao buscar jogadores",
            variant: "destructive"
        });
        return [];
    }

    // 3) Combina as duas listas em um array de Match
    //    Partimos do princípio de que "playersData" tem um campo "matchId"
    const matchMap = new Map<string, Match>();

    // Inicializa o map de partidas
    (matchesData || []).forEach((m) => {
        matchMap.set(m.id, {
            ...m,
            players: [] // adicionaremos já já
        });
    });

    // Associa cada player à sua partida
    (playersData || []).forEach((p) => {
        const match = matchMap.get(p.matchId);
        if (match) {
            match.players.push(p);
        }
    });

    return Array.from(matchMap.values());
}

/**
 * Carrega uma única partida pelo ID, incluindo seus players.
 */
async function loadMatchById(id: string): Promise<Match | undefined> {
    // Busca a partida
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

    if (matchError || !match) {
        console.error(`Erro ao buscar match ${id}:`, matchError);
        return undefined;
    }

    // Busca os players relacionados
    const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('matchId', id);

    if (playersError) {
        console.error(`Erro ao buscar players para match ${id}:`, playersError);
        return { ...match, players: [] };
    }

    return { ...match, players };
}

export const dbService = {
    /**
     * Get all matches
     */
    getMatches: async (): Promise<Match[]> => {
        try {
            return await loadAllMatches();
        } catch (error) {
            console.error('Erro getMatches:', error);
            return [];
        }
    },

    /**
     * Get match by ID
     */
    getMatchById: async (id: string): Promise<Match | undefined> => {
        try {
            return await loadMatchById(id);
        } catch (error) {
            console.error('Erro getMatchById:', error);
            return undefined;
        }
    },

    /**
     * Create a new match
     */
    createMatch: async (match: Match): Promise<Match> => {
        try {
            // 1) Calcula status/valores
            const calculatedMatch = updateMatchStatus(match);

            // 2) Insere a partida na tabela "matches"
            //    (Supondo que 'id', 'courtCost', etc. existam como colunas)
            const { data: insertedMatches, error: insertMatchError } = await supabase
                .from('matches')
                .insert([{
                    id: calculatedMatch.id,
                    courtCost: calculatedMatch.courtCost,
                    totalHours: calculatedMatch.totalHours,
                    date: calculatedMatch.date,
                    pixKey: calculatedMatch.pixKey,
                    status: calculatedMatch.status,
                    completionDate: calculatedMatch.completionDate ?? null
                }])
                .select();

            if (insertMatchError || !insertedMatches || insertedMatches.length === 0) {
                throw new Error(insertMatchError?.message || 'Falha ao inserir match');
            }

            // 3) Insere os players (se existirem) na tabela "players"
            if (calculatedMatch.players?.length) {
                const { error: insertPlayersError } = await supabase
                    .from('players')
                    .insert(
                        calculatedMatch.players.map((p) => ({
                            id: p.id,
                            matchId: calculatedMatch.id,
                            name: p.name,
                            hoursPlayed: p.hoursPlayed,
                            amount: p.amount,
                            paid: p.paid,
                            paymentDate: p.paymentDate ?? null,
                            receiptUrl: p.receiptUrl ?? null
                        }))
                    );

                if (insertPlayersError) {
                    throw new Error(insertPlayersError.message);
                }
            }

            // 4) Retorna a partida completa (com players)
            const finalMatch = await loadMatchById(calculatedMatch.id);
            if (!finalMatch) {
                throw new Error('Falha ao carregar partida após criação');
            }
            return finalMatch;
        } catch (error) {
            console.error('Erro ao criar partida:', error);
            toast?.({
                title: "Erro",
                description: "Falha ao criar partida",
                variant: "destructive"
            });
            throw error;
        }
    },

    /**
     * Update existing match
     */
    updateMatch: async (match: Match): Promise<Match> => {
        // 1) Verifica se existe
        const existing = await loadMatchById(match.id);
        if (!existing) {
            throw new Error(`Match with ID ${match.id} not found`);
        }

        // 2) Atualiza status/valores
        const updatedMatch = updateMatchStatus(match);

        // 3) Faz o update na tabela "matches"
        const { data, error } = await supabase
            .from('matches')
            .update({
                courtCost: updatedMatch.courtCost,
                totalHours: updatedMatch.totalHours,
                date: updatedMatch.date,
                pixKey: updatedMatch.pixKey,
                status: updatedMatch.status,
                completionDate: updatedMatch.completionDate ?? null
            })
            .eq('id', updatedMatch.id)
            .select();

        if (error || !data || data.length === 0) {
            console.error('Erro ao atualizar match:', error);
            throw new Error(error?.message || 'Falha ao atualizar match');
        }

        // (Não atualizamos players aqui; se quiser, faça método separado)
        // 4) Retorna o match completo com players
        const final = await loadMatchById(match.id);
        if (!final) {
            throw new Error('Falha ao recarregar match após update');
        }
        return final;
    },

    /**
     * Delete a match
     */
    deleteMatch: async (id: string): Promise<void> => {
        // Deleta a partida (se o FK de players tiver ON DELETE CASCADE, deleta também)
        const { error } = await supabase
            .from('matches')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar match:', error);
            toast?.({
                title: "Erro",
                description: "Falha ao deletar partida",
                variant: "destructive"
            });
            throw error;
        }
    },

    /**
     * Update player payment status
     */
    updatePlayerPayment: async (
        matchId: string,
        playerId: string,
        paid: boolean,
        receiptUrl?: string
    ): Promise<Match> => {
        // 1) Carrega a partida
        const match = await loadMatchById(matchId);
        if (!match) {
            throw new Error(`Match with ID ${matchId} not found`);
        }

        // 2) Verifica se o jogador existe
        const indexPlayer = match.players.findIndex((p) => p.id === playerId);
        if (indexPlayer === -1) {
            throw new Error(`Player with ID ${playerId} not found in match`);
        }

        // 3) Atualiza o player no Supabase
        const player = match.players[indexPlayer];
        const paymentDate = paid ? new Date().toISOString() : null;
        const { data: updatedPlayer, error: updatePlayerError } = await supabase
            .from('players')
            .update({
                paid,
                paymentDate,
                receiptUrl: paid ? (receiptUrl || player.receiptUrl) : null
            })
            .eq('id', playerId)
            .eq('matchId', matchId)
            .select()
            .single();

        if (updatePlayerError) {
            console.error('Erro ao atualizar player:', updatePlayerError);
            throw updatePlayerError;
        }

        // Substitui o objeto encontrado por um novo objeto
        match.players[indexPlayer] = updatedPlayer;

        // 4) Recalcula status do match
        const updatedMatchObj = updateMatchStatus(match);

        // 5) Atualiza o match (se status mudou)
        const { error: updateMatchError } = await supabase
            .from('matches')
            .update({
                status: updatedMatchObj.status,
                completionDate: updatedMatchObj.completionDate ?? null
            })
            .eq('id', matchId);

        if (updateMatchError) {
            console.error('Erro ao atualizar status da match:', updateMatchError);
            throw updateMatchError;
        }

        // 6) Retorna o match atualizado
        const final = await loadMatchById(matchId);
        if (!final) {
            throw new Error('Falha ao recarregar partida após pagamento');
        }
        return final;
    },

    /**
     * Get filtered matches
     */
    getFilteredMatches: async (
        filter: 'all' | 'pending' | 'complete' | 'unpaidByPlayer',
        playerId?: string
    ): Promise<Match[]> => {
        // Exemplo simples: busca todas e filtra em memória
        // (Para grandes volumes, use WHERE .eq('status', 'pending') etc.)
        const allMatches = await dbService.getMatches();

        switch (filter) {
            case 'pending':
                return allMatches.filter((m) => m.status === 'pending');
            case 'complete':
                return allMatches.filter((m) => m.status === 'complete');
            case 'unpaidByPlayer':
                if (!playerId) return allMatches;
                return allMatches.filter((m) =>
                    m.players.some((p) => p.id === playerId && !p.paid)
                );
            case 'all':
            default:
                return allMatches;
        }
    },
};

export default dbService;