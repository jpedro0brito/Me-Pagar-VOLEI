-- PostgreSQL Schema for Volleyball Match Management System
-- Certifique-se de estar conectado ao banco de dados "VolleyballManager".
-- Caso o banco ainda não exista, crie-o manualmente (o PostgreSQL não suporta "IF NOT EXISTS" em CREATE DATABASE):

-- ==========================================
-- Tabelas
-- ==========================================

-- Criação da tabela Matches
CREATE TABLE IF NOT EXISTS "Matches" (
    "Id" VARCHAR(36) PRIMARY KEY,
    "CourtCost" DECIMAL(10,2) NOT NULL,
    "TotalHours" DECIMAL(5,2) NOT NULL,
    "Date" TIMESTAMP NOT NULL,
    "PixKey" VARCHAR(255),
    "Status" VARCHAR(20) NOT NULL CHECK ("Status" IN ('pending', 'complete')),
    "CompletionDate" TIMESTAMP
);

-- Criação da tabela Players
CREATE TABLE IF NOT EXISTS "Players" (
    "Id" VARCHAR(36) PRIMARY KEY,
    "MatchId" VARCHAR(36) NOT NULL,
    "Name" VARCHAR(100) NOT NULL,
    "HoursPlayed" DECIMAL(5,2) NOT NULL,
    "Amount" DECIMAL(10,2),
    "Paid" BOOLEAN NOT NULL DEFAULT false,
    "PaymentDate" TIMESTAMP,
    "ReceiptUrl" TEXT,
    CONSTRAINT "FK_Players_Matches" FOREIGN KEY ("MatchId") REFERENCES "Matches"("Id") ON DELETE CASCADE
);

-- Criação da tabela Receipts (para armazenar metadados de arquivos – os arquivos propriamente ditos podem ser armazenados externamente)
CREATE TABLE IF NOT EXISTS "Receipts" (
    "Id" VARCHAR(36) PRIMARY KEY,
    "PlayerId" VARCHAR(36) NOT NULL,
    "FileName" VARCHAR(255) NOT NULL,
    "ContentType" VARCHAR(100) NOT NULL,
    "UploadDate" TIMESTAMP NOT NULL,
    "FileSize" INT NOT NULL,
    "StoragePath" TEXT NOT NULL,
    CONSTRAINT "FK_Receipts_Players" FOREIGN KEY ("PlayerId") REFERENCES "Players"("Id") ON DELETE CASCADE
);

-- ==========================================
-- Funções (equivalentes aos Stored Procedures)
-- ==========================================

-- Função GetMatchesWithPlayers: retorna partidas com seus jogadores
CREATE OR REPLACE FUNCTION "GetMatchesWithPlayers"()
RETURNS TABLE(
    "Id" VARCHAR(36),
    "CourtCost" DECIMAL(10,2),
    "TotalHours" DECIMAL(5,2),
    "Date" TIMESTAMP,
    "PixKey" VARCHAR(255),
    "Status" VARCHAR(20),
    "CompletionDate" TIMESTAMP,
    "PlayerId" VARCHAR(36),
    "Name" VARCHAR(100),
    "HoursPlayed" DECIMAL(5,2),
    "Amount" DECIMAL(10,2),
    "Paid" BOOLEAN,
    "PaymentDate" TIMESTAMP,
    "ReceiptUrl" TEXT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m."Id", 
        m."CourtCost", 
        m."TotalHours", 
        m."Date", 
        m."PixKey", 
        m."Status", 
        m."CompletionDate",
        p."Id" AS "PlayerId",
        p."Name",
        p."HoursPlayed",
        p."Amount",
        p."Paid",
        p."PaymentDate",
        p."ReceiptUrl"
    FROM "Matches" m
    LEFT JOIN "Players" p ON m."Id" = p."MatchId"
    ORDER BY m."Date" DESC;
END;
$$ LANGUAGE plpgsql;


-- Função GetFilteredMatches: retorna partidas filtradas conforme parâmetros
CREATE OR REPLACE FUNCTION "GetFilteredMatches"(p_filtertype VARCHAR(20), p_playerid VARCHAR(36) DEFAULT NULL)
RETURNS TABLE(
    "Id" VARCHAR(36),
    "CourtCost" DECIMAL(10,2),
    "TotalHours" DECIMAL(5,2),
    "Date" TIMESTAMP,
    "PixKey" VARCHAR(255),
    "Status" VARCHAR(20),
    "CompletionDate" TIMESTAMP,
    "PlayerId" VARCHAR(36),
    "Name" VARCHAR(100),
    "HoursPlayed" DECIMAL(5,2),
    "Amount" DECIMAL(10,2),
    "Paid" BOOLEAN,
    "PaymentDate" TIMESTAMP,
    "ReceiptUrl" TEXT
)
AS $$
BEGIN
    IF p_filtertype = 'all' THEN
        RETURN QUERY
        SELECT 
            m."Id", 
            m."CourtCost", 
            m."TotalHours", 
            m."Date", 
            m."PixKey", 
            m."Status", 
            m."CompletionDate",
            p."Id" AS "PlayerId",
            p."Name",
            p."HoursPlayed",
            p."Amount",
            p."Paid",
            p."PaymentDate",
            p."ReceiptUrl"
        FROM "Matches" m
        LEFT JOIN "Players" p ON m."Id" = p."MatchId"
        ORDER BY m."Date" DESC;
    ELSIF p_filtertype = 'pending' THEN
        RETURN QUERY
        SELECT 
            m."Id", 
            m."CourtCost", 
            m."TotalHours", 
            m."Date", 
            m."PixKey", 
            m."Status", 
            m."CompletionDate",
            p."Id" AS "PlayerId",
            p."Name",
            p."HoursPlayed",
            p."Amount",
            p."Paid",
            p."PaymentDate",
            p."ReceiptUrl"
        FROM "Matches" m
        LEFT JOIN "Players" p ON m."Id" = p."MatchId"
        WHERE m."Status" = 'pending'
        ORDER BY m."Date" DESC;
    ELSIF p_filtertype = 'complete' THEN
        RETURN QUERY
        SELECT 
            m."Id", 
            m."CourtCost", 
            m."TotalHours", 
            m."Date", 
            m."PixKey", 
            m."Status", 
            m."CompletionDate",
            p."Id" AS "PlayerId",
            p."Name",
            p."HoursPlayed",
            p."Amount",
            p."Paid",
            p."PaymentDate",
            p."ReceiptUrl"
        FROM "Matches" m
        LEFT JOIN "Players" p ON m."Id" = p."MatchId"
        WHERE m."Status" = 'complete'
        ORDER BY m."Date" DESC;
    ELSIF p_filtertype = 'unpaidByPlayer' AND p_playerid IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            m."Id", 
            m."CourtCost", 
            m."TotalHours", 
            m."Date", 
            m."PixKey", 
            m."Status", 
            m."CompletionDate",
            p."Id" AS "PlayerId",
            p."Name",
            p."HoursPlayed",
            p."Amount",
            p."Paid",
            p."PaymentDate",
            p."ReceiptUrl"
        FROM "Matches" m
        LEFT JOIN "Players" p ON m."Id" = p."MatchId"
        WHERE EXISTS (
            SELECT 1 
            FROM "Players" p2 
            WHERE p2."MatchId" = m."Id" 
              AND p2."Id" = p_playerid 
              AND p2."Paid" = false
        )
        ORDER BY m."Date" DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Função UpdateMatchStatus: atualiza o status de uma partida conforme os pagamentos dos jogadores
CREATE OR REPLACE FUNCTION "UpdateMatchStatus"(p_matchid VARCHAR(36))
RETURNS void
AS $$
DECLARE
    allPaid BOOLEAN := true;
BEGIN
    -- Verifica se há algum jogador não pago
    IF EXISTS (SELECT 1 FROM "Players" WHERE "MatchId" = p_matchid AND "Paid" = false) THEN
        allPaid := false;
    END IF;
    
    IF allPaid = true AND EXISTS (SELECT 1 FROM "Matches" WHERE "Id" = p_matchid AND "Status" = 'pending') THEN
        -- Se todos pagaram e o status estava como pending, atualiza para complete com a data de conclusão
        UPDATE "Matches"
        SET "Status" = 'complete',
            "CompletionDate" = NOW() AT TIME ZONE 'UTC'
        WHERE "Id" = p_matchid;
    ELSIF allPaid = false AND EXISTS (SELECT 1 FROM "Matches" WHERE "Id" = p_matchid AND "Status" = 'complete') THEN
        -- Se nem todos pagaram e o status estava complete, atualiza para pending
        UPDATE "Matches"
        SET "Status" = 'pending',
            "CompletionDate" = NULL
        WHERE "Id" = p_matchid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Índices para performance
-- ==========================================

CREATE INDEX IF NOT EXISTS "IX_Players_MatchId" ON "Players"("MatchId");
CREATE INDEX IF NOT EXISTS "IX_Matches_Status" ON "Matches"("Status");
CREATE INDEX IF NOT EXISTS "IX_Players_Paid" ON "Players"("Paid");

-- ==========================================
-- Dados de exemplo (opcional)
-- ==========================================
/*
-- Exemplo de partida 1
INSERT INTO "Matches" ("Id", "CourtCost", "TotalHours", "Date", "PixKey", "Status")
VALUES ('00000000-0000-0000-0000-000000000001', 150.00, 2.0, (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days', 'email@example.com', 'pending');

-- Jogadores para a partida 1
INSERT INTO "Players" ("Id", "MatchId", "Name", "HoursPlayed", "Amount", "Paid")
VALUES 
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'João Silva', 2.0, 50.00, true),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Maria Souza', 2.0, 50.00, false),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Pedro Santos', 1.5, 37.50, false);

-- Exemplo de partida 2
INSERT INTO "Matches" ("Id", "CourtCost", "TotalHours", "Date", "PixKey", "Status", "CompletionDate")
VALUES ('00000000-0000-0000-0000-000000000002', 200.00, 3.0, (NOW() AT TIME ZONE 'UTC') - INTERVAL '14 days', 'telefone@example.com', 'complete', (NOW() AT TIME ZONE 'UTC') - INTERVAL '13 days');

-- Jogadores para a partida 2
INSERT INTO "Players" ("Id", "MatchId", "Name", "HoursPlayed", "Amount", "Paid", "PaymentDate")
VALUES 
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Ana Costa', 3.0, 60.00, true, (NOW() AT TIME ZONE 'UTC') - INTERVAL '14 days'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Carlos Oliveira', 3.0, 60.00, true, (NOW() AT TIME ZONE 'UTC') - INTERVAL '13 days'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Juliana Lima', 2.0, 40.00, true, (NOW() AT TIME ZONE 'UTC') - INTERVAL '13 days'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Rafael Pereira', 2.0, 40.00, true, (NOW() AT TIME ZONE 'UTC') - INTERVAL '13 days');
*/

-- Aviso de conclusão
-- (Em PostgreSQL, utilize mensagens de log ou comentários para indicar que o script foi executado com sucesso)
