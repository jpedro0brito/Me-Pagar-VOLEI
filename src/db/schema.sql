-- SQL Server Schema for Volleyball Match Management System

-- Create database (if not exists)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'VolleyballManager')
BEGIN
    CREATE DATABASE VolleyballManager;
END
GO

USE VolleyballManager;
GO

-- Create Matches table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Matches')
BEGIN
    CREATE TABLE Matches (
        Id NVARCHAR(36) PRIMARY KEY,
        CourtCost DECIMAL(10, 2) NOT NULL,
        TotalHours DECIMAL(5, 2) NOT NULL,
        Date DATETIME2 NOT NULL,
        PixKey NVARCHAR(255),
        Status NVARCHAR(20) NOT NULL CHECK (Status IN ('pending', 'complete')),
        CompletionDate DATETIME2 NULL
    );
END
GO

-- Create Players table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Players')
BEGIN
    CREATE TABLE Players (
        Id NVARCHAR(36) PRIMARY KEY,
        MatchId NVARCHAR(36) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        HoursPlayed DECIMAL(5, 2) NOT NULL,
        Amount DECIMAL(10, 2) NULL,
        Paid BIT NOT NULL DEFAULT 0,
        PaymentDate DATETIME2 NULL,
        ReceiptUrl NVARCHAR(MAX) NULL,
        CONSTRAINT FK_Players_Matches FOREIGN KEY (MatchId) REFERENCES Matches(Id) ON DELETE CASCADE
    );
END
GO

-- Create Receipts table (for storing file metadata - actual files would be stored elsewhere)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Receipts')
BEGIN
    CREATE TABLE Receipts (
        Id NVARCHAR(36) PRIMARY KEY,
        PlayerId NVARCHAR(36) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        ContentType NVARCHAR(100) NOT NULL,
        UploadDate DATETIME2 NOT NULL,
        FileSize INT NOT NULL,
        StoragePath NVARCHAR(MAX) NOT NULL,
        CONSTRAINT FK_Receipts_Players FOREIGN KEY (PlayerId) REFERENCES Players(Id) ON DELETE CASCADE
    );
END
GO

-- Create stored procedures for common operations

-- GetMatchesWithPlayers procedure to efficiently retrieve matches with their players
IF OBJECT_ID('GetMatchesWithPlayers', 'P') IS NULL
BEGIN
    EXEC('
    CREATE PROCEDURE GetMatchesWithPlayers
    AS
    BEGIN
        SET NOCOUNT ON;
        
        SELECT 
            m.Id, 
            m.CourtCost, 
            m.TotalHours, 
            m.Date, 
            m.PixKey, 
            m.Status, 
            m.CompletionDate,
            p.Id AS PlayerId,
            p.Name,
            p.HoursPlayed,
            p.Amount,
            p.Paid,
            p.PaymentDate,
            p.ReceiptUrl
        FROM Matches m
        LEFT JOIN Players p ON m.Id = p.MatchId
        ORDER BY m.Date DESC;
    END
    ');
END
GO

-- GetFilteredMatches procedure to retrieve matches based on various filters
IF OBJECT_ID('GetFilteredMatches', 'P') IS NULL
BEGIN
    EXEC('
    CREATE PROCEDURE GetFilteredMatches
        @FilterType NVARCHAR(20),
        @PlayerId NVARCHAR(36) = NULL
    AS
    BEGIN
        SET NOCOUNT ON;
        
        IF @FilterType = ''all''
        BEGIN
            SELECT 
                m.Id, 
                m.CourtCost, 
                m.TotalHours, 
                m.Date, 
                m.PixKey, 
                m.Status, 
                m.CompletionDate,
                p.Id AS PlayerId,
                p.Name,
                p.HoursPlayed,
                p.Amount,
                p.Paid,
                p.PaymentDate,
                p.ReceiptUrl
            FROM Matches m
            LEFT JOIN Players p ON m.Id = p.MatchId
            ORDER BY m.Date DESC;
        END
        ELSE IF @FilterType = ''pending''
        BEGIN
            SELECT 
                m.Id, 
                m.CourtCost, 
                m.TotalHours, 
                m.Date, 
                m.PixKey, 
                m.Status, 
                m.CompletionDate,
                p.Id AS PlayerId,
                p.Name,
                p.HoursPlayed,
                p.Amount,
                p.Paid,
                p.PaymentDate,
                p.ReceiptUrl
            FROM Matches m
            LEFT JOIN Players p ON m.Id = p.MatchId
            WHERE m.Status = ''pending''
            ORDER BY m.Date DESC;
        END
        ELSE IF @FilterType = ''complete''
        BEGIN
            SELECT 
                m.Id, 
                m.CourtCost, 
                m.TotalHours, 
                m.Date, 
                m.PixKey, 
                m.Status, 
                m.CompletionDate,
                p.Id AS PlayerId,
                p.Name,
                p.HoursPlayed,
                p.Amount,
                p.Paid,
                p.PaymentDate,
                p.ReceiptUrl
            FROM Matches m
            LEFT JOIN Players p ON m.Id = p.MatchId
            WHERE m.Status = ''complete''
            ORDER BY m.Date DESC;
        END
        ELSE IF @FilterType = ''unpaidByPlayer'' AND @PlayerId IS NOT NULL
        BEGIN
            SELECT 
                m.Id, 
                m.CourtCost, 
                m.TotalHours, 
                m.Date, 
                m.PixKey, 
                m.Status, 
                m.CompletionDate,
                p.Id AS PlayerId,
                p.Name,
                p.HoursPlayed,
                p.Amount,
                p.Paid,
                p.PaymentDate,
                p.ReceiptUrl
            FROM Matches m
            LEFT JOIN Players p ON m.Id = p.MatchId
            WHERE EXISTS (
                SELECT 1 
                FROM Players p2 
                WHERE p2.MatchId = m.Id 
                  AND p2.Id = @PlayerId 
                  AND p2.Paid = 0
            )
            ORDER BY m.Date DESC;
        END
    END
    ');
END
GO

-- UpdateMatchStatus procedure to update a match status based on player payments
IF OBJECT_ID('UpdateMatchStatus', 'P') IS NULL
BEGIN
    EXEC('
    CREATE PROCEDURE UpdateMatchStatus
        @MatchId NVARCHAR(36)
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @AllPaid BIT = 1;
        
        -- Check if all players have paid
        IF EXISTS (SELECT 1 FROM Players WHERE MatchId = @MatchId AND Paid = 0)
        BEGIN
            SET @AllPaid = 0;
        END
        
        -- Update match status based on payments
        IF @AllPaid = 1 AND EXISTS (SELECT 1 FROM Matches WHERE Id = @MatchId AND Status = ''pending'')
        BEGIN
            -- All paid and status was pending, update to complete with completion date
            UPDATE Matches
            SET Status = ''complete'',
                CompletionDate = GETUTCDATE()
            WHERE Id = @MatchId;
        END
        ELSE IF @AllPaid = 0 AND EXISTS (SELECT 1 FROM Matches WHERE Id = @MatchId AND Status = ''complete'')
        BEGIN
            -- Not all paid and status was complete, update to pending
            UPDATE Matches
            SET Status = ''pending'',
                CompletionDate = NULL
            WHERE Id = @MatchId;
        END
    END
    ');
END
GO

-- Create indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Players_MatchId' AND object_id = OBJECT_ID('Players'))
BEGIN
    CREATE INDEX IX_Players_MatchId ON Players(MatchId);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Matches_Status' AND object_id = OBJECT_ID('Matches'))
BEGIN
    CREATE INDEX IX_Matches_Status ON Matches(Status);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Players_Paid' AND object_id = OBJECT_ID('Players'))
BEGIN
    CREATE INDEX IX_Players_Paid ON Players(Paid);
END
GO

-- Create sample data for testing (if needed)
-- Uncomment and run this section to populate sample data

/*
-- Sample match 1
INSERT INTO Matches (Id, CourtCost, TotalHours, Date, PixKey, Status)
VALUES ('00000000-0000-0000-0000-000000000001', 150.00, 2.0, DATEADD(day, -7, GETUTCDATE()), 'email@example.com', 'pending');

-- Players for match 1
INSERT INTO Players (Id, MatchId, Name, HoursPlayed, Amount, Paid)
VALUES 
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'João Silva', 2.0, 50.00, 1),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Maria Souza', 2.0, 50.00, 0),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Pedro Santos', 1.5, 37.50, 0);

-- Sample match 2
INSERT INTO Matches (Id, CourtCost, TotalHours, Date, PixKey, Status, CompletionDate)
VALUES ('00000000-0000-0000-0000-000000000002', 200.00, 3.0, DATEADD(day, -14, GETUTCDATE()), 'telefone@example.com', 'complete', DATEADD(day, -13, GETUTCDATE()));

-- Players for match 2
INSERT INTO Players (Id, MatchId, Name, HoursPlayed, Amount, Paid, PaymentDate)
VALUES 
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Ana Costa', 3.0, 60.00, 1, DATEADD(day, -14, GETUTCDATE())),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Carlos Oliveira', 3.0, 60.00, 1, DATEADD(day, -13, GETUTCDATE())),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Juliana Lima', 2.0, 40.00, 1, DATEADD(day, -13, GETUTCDATE())),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Rafael Pereira', 2.0, 40.00, 1, DATEADD(day, -13, GETUTCDATE()));
*/

PRINT 'Database schema created successfully!'
GO
