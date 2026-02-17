-- Reset complet de la base Audit pour repartir à blanc avec les données de référence
SET NOCOUNT ON;

IF DB_ID('Audit') IS NULL
BEGIN
    PRINT 'La base Audit est introuvable.';
    RETURN;
END
GO

USE Audit;
GO

BEGIN TRANSACTION;
BEGIN TRY
    -- Purge des tables dépendantes en respectant les FK
    DELETE FROM dbo.audit_resultat;
    DELETE FROM dbo.audit;
    DELETE FROM dbo.lignes;
    DELETE FROM dbo.norme;
    DELETE FROM dbo.service;
    DELETE FROM dbo.utilisateur;

    -- Reseed des identités
    DBCC CHECKIDENT ('dbo.audit_resultat', RESEED, 0);
    DBCC CHECKIDENT ('dbo.audit', RESEED, 0);
    DBCC CHECKIDENT ('dbo.lignes', RESEED, 0);
    DBCC CHECKIDENT ('dbo.norme', RESEED, 0);
    DBCC CHECKIDENT ('dbo.service', RESEED, 0);
    DBCC CHECKIDENT ('dbo.utilisateur', RESEED, 0);

    -- Données de référence (mêmes valeurs que le dump MySQL fourni)
    SET IDENTITY_INSERT dbo.norme ON;
    INSERT INTO dbo.norme (id, code, libelle, description, date_norme) VALUES
        (1, N'ISOXXXX', N'ISO XXX:XX', NULL, '2025-11-28');
    SET IDENTITY_INSERT dbo.norme OFF;

    SET IDENTITY_INSERT dbo.service ON;
    INSERT INTO dbo.service (id, nom, description) VALUES
        (1, N'qualité', NULL),
        (2, N'RH', NULL),
        (3, N'Compta', NULL),
        (4, N'Achat', NULL);
    SET IDENTITY_INSERT dbo.service OFF;

    SET IDENTITY_INSERT dbo.lignes ON;
    INSERT INTO dbo.lignes (id, norme_id, service_id, code, intitule, description, obligatoire, poids, ordre) VALUES
        (1, 1, 4, N'8.9', N'Test', NULL, 1, NULL, NULL),
        (2, 1, 1, N'8.9', N'Test', NULL, 1, NULL, NULL),
        (3, 1, 4, N'8.9', N't', NULL, 1, 0.00, 0),
        (5, 1, 1, N'8.9', N't', NULL, 1, 0.00, 0);
    SET IDENTITY_INSERT dbo.lignes OFF;

    SET IDENTITY_INSERT dbo.utilisateur ON;
    INSERT INTO dbo.utilisateur (id, username, display_name, password_hash, role, created_at) VALUES
        (5, N'idir', N'idir', N'1c1c874dd22a880e6ad3b5e97b868094:47771b04eaeba424955b48f2f3bec341aa4b01d4e0f65e83804f38f010f54358', N'ADMIN', '2025-11-27T08:13:01');
    SET IDENTITY_INSERT dbo.utilisateur OFF;

    COMMIT TRANSACTION;
    PRINT 'Reset de la base Audit terminé.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Erreur lors du reset : ' + ERROR_MESSAGE();
END CATCH;
GO
