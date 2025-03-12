-- Atenção: a criação do banco de dados deve ser feita separadamente, por exemplo:
--   CREATE DATABASE "volleyballmanager";

-- Conecte-se ao banco de dados "volleyballmanager"

-----------------------------------------------------------
-- Criação da tabela "matches"
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "matches" (
    "id" VARCHAR(36) PRIMARY KEY,
    "courtCost" DECIMAL(10,2) NOT NULL,
    "totalHours" DECIMAL(5,2) NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "pixKey" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL CHECK ("status" IN ('pending', 'complete')),
    "completionDate" TIMESTAMP
);

-----------------------------------------------------------
-- Criação da tabela "players"
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "players" (
    "id" VARCHAR(36) PRIMARY KEY,
    "matchId" VARCHAR(36) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "hoursPlayed" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(10,2),
    "paid" BOOLEAN NOT NULL DEFAULT FALSE,
    "paymentDate" TIMESTAMP,
    "receiptUrl" TEXT,
    CONSTRAINT "fk_players_matches" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE
);

-----------------------------------------------------------
-- Criação da tabela "receipts"
-----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "receipts" (
    "id" VARCHAR(36) PRIMARY KEY,
    "playerId" VARCHAR(36) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "uploadDate" TIMESTAMP NOT NULL,
    "fileSize" INT NOT NULL,
    "storagePath" TEXT NOT NULL,
    CONSTRAINT "fk_receipts_players" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE
);

-----------------------------------------------------------
-- Criação das funções para operações comuns
-----------------------------------------------------------

-- Função getMatchesWithPlayers para retornar partidas com seus jogadores
DROP FUNCTION IF EXISTS getMatchesWithPlayers();
CREATE OR REPLACE FUNCTION getMatchesWithPlayers()
RETURNS TABLE (
    "id" VARCHAR(36),
    "courtCost" DECIMAL(10,2),
    "totalHours" DECIMAL(5,2),
    "date" TIMESTAMP,
    "pixKey" VARCHAR(255),
    "status" VARCHAR(20),
    "completionDate" TIMESTAMP,
    "playerId" VARCHAR(36),
    "name" VARCHAR(100),
    "hoursPlayed" DECIMAL(5,2),
    "amount" DECIMAL(10,2),
    "paid" BOOLEAN,
    "paymentDate" TIMESTAMP,
    "receiptUrl" TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m."id",
        m."courtCost",
        m."totalHours",
        m."date",
        m."pixKey",
        m."status",
        m."completionDate",
        p."id" AS "playerId",
        p."name",
        p."hoursPlayed",
        p."amount",
        p."paid",
        p."paymentDate",
        p."receiptUrl"
    FROM "matches" m
    LEFT JOIN "players" p ON m."id" = p."matchId"
    ORDER BY m."date" DESC;
END;
$$ LANGUAGE plpgsql;

-- Função getFilteredMatches para retornar partidas conforme filtros
DROP FUNCTION IF EXISTS getFilteredMatches(VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION getFilteredMatches(
    filterType VARCHAR(20),
    playerIdParam VARCHAR(36) DEFAULT NULL
)
RETURNS TABLE (
    "id" VARCHAR(36),
    "courtCost" DECIMAL(10,2),
    "totalHours" DECIMAL(5,2),
    "date" TIMESTAMP,
    "pixKey" VARCHAR(255),
    "status" VARCHAR(20),
    "completionDate" TIMESTAMP,
    "playerId" VARCHAR(36),
    "name" VARCHAR(100),
    "hoursPlayed" DECIMAL(5,2),
    "amount" DECIMAL(10,2),
    "paid" BOOLEAN,
    "paymentDate" TIMESTAMP,
    "receiptUrl" TEXT
) AS $$
BEGIN
    IF filterType = 'all' THEN
        RETURN QUERY
        SELECT 
            m."id",
            m."courtCost",
            m."totalHours",
            m."date",
            m."pixKey",
            m."status",
            m."completionDate",
            p."id" AS "playerId",
            p."name",
            p."hoursPlayed",
            p."amount",
            p."paid",
            p."paymentDate",
            p."receiptUrl"
        FROM "matches" m
        LEFT JOIN "players" p ON m."id" = p."matchId"
        ORDER BY m."date" DESC;
    ELSIF filterType = 'pending' THEN
        RETURN QUERY
        SELECT 
            m."id",
            m."courtCost",
            m."totalHours",
            m."date",
            m."pixKey",
            m."status",
            m."completionDate",
            p."id" AS "playerId",
            p."name",
            p."hoursPlayed",
            p."amount",
            p."paid",
            p."paymentDate",
            p."receiptUrl"
        FROM "matches" m
        LEFT JOIN "players" p ON m."id" = p."matchId"
        WHERE m."status" = 'pending'
        ORDER BY m."date" DESC;
    ELSIF filterType = 'complete' THEN
        RETURN QUERY
        SELECT 
            m."id",
            m."courtCost",
            m."totalHours",
            m."date",
            m."pixKey",
            m."status",
            m."completionDate",
            p."id" AS "playerId",
            p."name",
            p."hoursPlayed",
            p."amount",
            p."paid",
            p."paymentDate",
            p."receiptUrl"
        FROM "matches" m
        LEFT JOIN "players" p ON m."id" = p."matchId"
        WHERE m."status" = 'complete'
        ORDER BY m."date" DESC;
    ELSIF filterType = 'unpaidByPlayer' AND playerIdParam IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            m."id",
            m."courtCost",
            m."totalHours",
            m."date",
            m."pixKey",
            m."status",
            m."completionDate",
            p."id" AS "playerId",
            p."name",
            p."hoursPlayed",
            p."amount",
            p."paid",
            p."paymentDate",
            p."receiptUrl"
        FROM "matches" m
        LEFT JOIN "players" p ON m."id" = p."matchId"
        WHERE EXISTS (
            SELECT 1 FROM "players" p2
            WHERE p2."matchId" = m."id" 
              AND p2."id" = playerIdParam 
              AND p2."paid" = FALSE
        )
        ORDER BY m."date" DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função updateMatchStatus para atualizar o status da partida conforme os pagamentos
DROP FUNCTION IF EXISTS updateMatchStatus(VARCHAR);
CREATE OR REPLACE FUNCTION updateMatchStatus(matchIdParam VARCHAR(36))
RETURNS VOID AS $$
DECLARE
    allPaid BOOLEAN := TRUE;
BEGIN
    -- Verifica se existe algum jogador não pago na partida
    IF EXISTS (SELECT 1 FROM "players" WHERE "matchId" = matchIdParam AND "paid" = FALSE) THEN
        allPaid := FALSE;
    END IF;

    -- Atualiza o status da partida conforme os pagamentos
    IF allPaid = TRUE THEN
        UPDATE "matches"
        SET "status" = 'complete',
            "completionDate" = NOW()
        WHERE "id" = matchIdParam AND "status" = 'pending';
    ELSIF allPaid = FALSE THEN
        UPDATE "matches"
        SET "status" = 'pending',
            "completionDate" = NULL
        WHERE "id" = matchIdParam AND "status" = 'complete';
    END IF;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------------------------
-- Criação de índices para performance
-----------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_players_matchid ON "players"("matchId");
CREATE INDEX IF NOT EXISTS ix_matches_status ON "matches"("status");
CREATE INDEX IF NOT EXISTS ix_players_paid ON "players"("paid");

-----------------------------------------------------------
-- Dados de exemplo (descomente se necessário)
-----------------------------------------------------------
/*
-- Partida de exemplo 1
INSERT INTO "matches" ("id", "courtCost", "totalHours", "date", "pixKey", "status")
VALUES ('00000000-0000-0000-0000-000000000001', 150.00, 2.0, NOW() - INTERVAL '7 days', 'email@example.com', 'pending');

-- Jogadores para a partida 1
INSERT INTO "players" ("id", "matchId", "name", "hoursPlayed", "amount", "paid")
VALUES 
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'João Silva', 2.0, 50.00, TRUE),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Maria Souza', 2.0, 50.00, FALSE),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Pedro Santos', 1.5, 37.50, FALSE);

-- Partida de exemplo 2
INSERT INTO "matches" ("id", "courtCost", "totalHours", "date", "pixKey", "status", "completionDate")
VALUES ('00000000-0000-0000-0000-000000000002', 200.00, 3.0, NOW() - INTERVAL '14 days', 'telefone@example.com', 'complete', NOW() - INTERVAL '13 days');

-- Jogadores para a partida 2
INSERT INTO "players" ("id", "matchId", "name", "hoursPlayed", "amount", "paid", "paymentDate")
VALUES 
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Ana Costa', 3.0, 60.00, TRUE, NOW() - INTERVAL '14 days'),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Carlos Oliveira', 3.0, 60.00, TRUE, NOW() - INTERVAL '13 days'),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Juliana Lima', 2.0, 40.00, TRUE, NOW() - INTERVAL '13 days'),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Rafael Pereira', 2.0, 40.00, TRUE, NOW() - INTERVAL '13 days');
*/
