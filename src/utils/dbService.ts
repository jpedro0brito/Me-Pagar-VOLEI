import { Match, Player, updateMatchStatus } from './calculations';
import { toast } from "@/hooks/use-toast";

// Mock db service using localStorage until connected to SQL Server
const STORAGE_KEY = 'volleyball-matches';

/**
 * Initialize connection to SQL Server (placeholder for actual implementation)
 * In a real implementation, this would use a library like node-mssql
 */
const initDatabaseConnection = () => {
    console.log('Database connection would be initialized here with actual credentials');
    // In a real implementation, this would connect to SQL Server
    return {
        connected: true,
        connectionId: 'mock-connection-id'
    };
};

// For now, we'll simulate with localStorage
const loadMatches = (): Match[] => {
    try {
        const storedMatches = localStorage.getItem(STORAGE_KEY);
        return storedMatches ? JSON.parse(storedMatches) : [];
    } catch (error) {
        console.error('Error loading matches from storage:', error);
        return [];
    }
};

const saveMatches = (matches: Match[]): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    } catch (error) {
        console.error('Error saving matches to storage:', error);
        toast({
            title: "Error",
            description: "Failed to save match data",
            variant: "destructive"
        });
    }
};

/**
 * Database service for match operations
 */
export const dbService = {
    // Get all matches
    getMatches: async (): Promise<Match[]> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return loadMatches();
    },

    // Get match by ID
    getMatchById: async (id: string): Promise<Match | undefined> => {
        const matches = loadMatches();
        return matches.find(match => match.id === id);
    },

    // Create a new match
    createMatch: async (match: Match): Promise<Match> => {
        const matches = loadMatches();

        // Update match with calculated amounts and status
        const calculatedMatch = updateMatchStatus(match);

        matches.push(calculatedMatch);
        saveMatches(matches);

        return calculatedMatch;
    },

    // Update existing match
    updateMatch: async (match: Match): Promise<Match> => {
        const matches = loadMatches();
        const index = matches.findIndex(m => m.id === match.id);

        if (index === -1) {
            throw new Error(`Match with ID ${match.id} not found`);
        }

        // Update match with calculated amounts and status
        const updatedMatch = updateMatchStatus(match);

        matches[index] = updatedMatch;
        saveMatches(matches);

        return updatedMatch;
    },

    // Delete a match
    deleteMatch: async (id: string): Promise<void> => {
        const matches = loadMatches();
        const filteredMatches = matches.filter(match => match.id !== id);
        saveMatches(filteredMatches);
    },

    // Update player payment status
    updatePlayerPayment: async (
        matchId: string,
        playerId: string,
        paid: boolean,
        receiptUrl?: string
    ): Promise<Match> => {
        const matches = loadMatches();
        const matchIndex = matches.findIndex(m => m.id === matchId);

        if (matchIndex === -1) {
            throw new Error(`Match with ID ${matchId} not found`);
        }

        const match = { ...matches[matchIndex] };
        const playerIndex = match.players.findIndex(p => p.id === playerId);

        if (playerIndex === -1) {
            throw new Error(`Player with ID ${playerId} not found in match`);
        }

        // Update player with payment info
        const paymentDate = paid ? new Date().toISOString() : undefined;

        match.players[playerIndex] = {
            ...match.players[playerIndex],
            paid,
            paymentDate,
            receiptUrl: paid ? (receiptUrl || match.players[playerIndex].receiptUrl) : undefined
        };

        // Update match status based on all players payment status
        const updatedMatch = updateMatchStatus(match);

        matches[matchIndex] = updatedMatch;
        saveMatches(matches);

        return updatedMatch;
    },

    // Get filtered matches
    getFilteredMatches: async (
        filter: 'all' | 'pending' | 'complete' | 'unpaidByPlayer',
        playerId?: string
    ): Promise<Match[]> => {
        const matches = loadMatches();

        switch (filter) {
            case 'pending':
                return matches.filter(match => match.status === 'pending');
            case 'complete':
                return matches.filter(match => match.status === 'complete');
            case 'unpaidByPlayer':
                if (!playerId) return matches;
                return matches.filter(match =>
                    match.players.some(player => player.id === playerId && !player.paid)
                );
            case 'all':
            default:
                return matches;
        }
    }
};

// Initialize connection
initDatabaseConnection();

export default dbService;
