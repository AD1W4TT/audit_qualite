-- Schema SQL Server Express pour l'application d'audit
SET NOCOUNT ON;

IF DB_ID('Audit') IS NULL
BEGIN
    CREATE DATABASE Audit;
END
GO

USE Audit;
GO

-- Nettoyage des objets existants
IF OBJECT_ID('dbo.v_lignes_detail', 'V') IS NOT NULL
    DROP VIEW dbo.v_lignes_detail;
GO

IF OBJECT_ID('dbo.audit_resultat', 'U') IS NOT NULL DROP TABLE dbo.audit_resultat;
IF OBJECT_ID('dbo.audit', 'U') IS NOT NULL DROP TABLE dbo.audit;
IF OBJECT_ID('dbo.lignes', 'U') IS NOT NULL DROP TABLE dbo.lignes;
IF OBJECT_ID('dbo.norme', 'U') IS NOT NULL DROP TABLE dbo.norme;
IF OBJECT_ID('dbo.service', 'U') IS NOT NULL DROP TABLE dbo.service;
IF OBJECT_ID('dbo.utilisateur', 'U') IS NOT NULL DROP TABLE dbo.utilisateur;
GO

CREATE TABLE dbo.utilisateur (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    display_name NVARCHAR(150) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(10) NOT NULL CONSTRAINT CK_utilisateur_role CHECK (role IN ('USER', 'ADMIN')),
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_utilisateur_created_at DEFAULT (GETDATE()),
    CONSTRAINT UQ_utilisateur_username UNIQUE (username)
);
GO

CREATE TABLE dbo.norme (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    code NVARCHAR(50) NOT NULL,
    libelle NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    date_norme DATE NULL,
    CONSTRAINT UQ_norme_code UNIQUE (code)
);
GO

CREATE TABLE dbo.service (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    nom NVARCHAR(150) NOT NULL,
    description NVARCHAR(MAX) NULL,
    CONSTRAINT UQ_service_nom UNIQUE (nom)
);
GO

CREATE TABLE dbo.lignes (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    norme_id INT NOT NULL,
    service_id INT NOT NULL,
    code NVARCHAR(50) NULL,
    intitule NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    obligatoire BIT NOT NULL CONSTRAINT DF_lignes_obligatoire DEFAULT (1),
    poids DECIMAL(6,2) NULL,
    ordre INT NULL,
    CONSTRAINT FK_lignes_norme FOREIGN KEY (norme_id) REFERENCES dbo.norme(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK_lignes_service FOREIGN KEY (service_id) REFERENCES dbo.service(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
GO

CREATE INDEX IX_lignes_norme ON dbo.lignes(norme_id);
CREATE INDEX IX_lignes_service ON dbo.lignes(service_id);
CREATE INDEX IX_lignes_norme_ordre ON dbo.lignes(norme_id, ordre);
GO

CREATE TABLE dbo.audit (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    norme_id INT NOT NULL,
    date_audit DATE NOT NULL,
    auditeur NVARCHAR(150) NULL,
    scope NVARCHAR(MAX) NULL,
    statut NVARCHAR(20) NOT NULL CONSTRAINT CK_audit_statut CHECK (statut IN ('BROUILLON', 'EN_COURS', 'CLOTURE')),
    CONSTRAINT FK_audit_norme FOREIGN KEY (norme_id) REFERENCES dbo.norme(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);
GO

CREATE INDEX IX_audit_norme ON dbo.audit(norme_id);
CREATE INDEX IX_audit_statut ON dbo.audit(statut);
GO

CREATE TABLE dbo.audit_resultat (
    id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    audit_id INT NOT NULL,
    ligne_id INT NOT NULL,
    statut NVARCHAR(20) NOT NULL CONSTRAINT CK_audit_resultat_statut CHECK (statut IN ('CONFORME', 'NON_CONFORME', 'NA', 'OBS')),
    score DECIMAL(5,2) NULL,
    commentaire NVARCHAR(MAX) NULL,
    preuve NVARCHAR(MAX) NULL,
    CONSTRAINT FK_audit_resultat_audit FOREIGN KEY (audit_id) REFERENCES dbo.audit(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT FK_audit_resultat_ligne FOREIGN KEY (ligne_id) REFERENCES dbo.lignes(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT UQ_audit_resultat UNIQUE (audit_id, ligne_id)
);
GO

CREATE INDEX IX_audit_resultat_audit ON dbo.audit_resultat(audit_id);
CREATE INDEX IX_audit_resultat_ligne ON dbo.audit_resultat(ligne_id);
GO

-- Données initiales (issues du dump MySQL)
SET IDENTITY_INSERT dbo.norme ON;
INSERT INTO dbo.norme (id, code, libelle, description, date_norme) VALUES
    (1, N'ISOXXXX', N'ISO XXX:XX', NULL, '2025-11-28');
SET IDENTITY_INSERT dbo.norme OFF;
GO

SET IDENTITY_INSERT dbo.service ON;
INSERT INTO dbo.service (id, nom, description) VALUES
    (1, N'qualité', NULL),
    (2, N'RH', NULL),
    (3, N'Compta', NULL),
    (4, N'Achat', NULL);
SET IDENTITY_INSERT dbo.service OFF;
GO

SET IDENTITY_INSERT dbo.lignes ON;
INSERT INTO dbo.lignes (id, norme_id, service_id, code, intitule, description, obligatoire, poids, ordre) VALUES
    (1, 1, 4, N'8.9', N'Test', NULL, 1, NULL, NULL),
    (2, 1, 1, N'8.9', N'Test', NULL, 1, NULL, NULL),
    (3, 1, 4, N'8.9', N't', NULL, 1, 0.00, 0),
    (5, 1, 1, N'8.9', N't', NULL, 1, 0.00, 0);
SET IDENTITY_INSERT dbo.lignes OFF;
GO

SET IDENTITY_INSERT dbo.utilisateur ON;
INSERT INTO dbo.utilisateur (id, username, display_name, password_hash, role, created_at) VALUES
    (5, N'idir', N'idir', N'1c1c874dd22a880e6ad3b5e97b868094:47771b04eaeba424955b48f2f3bec341aa4b01d4e0f65e83804f38f010f54358', N'ADMIN', '2025-11-27T08:13:01');
SET IDENTITY_INSERT dbo.utilisateur OFF;
GO

CREATE VIEW dbo.v_lignes_detail AS
SELECT
    l.id,
    l.code,
    l.intitule,
    l.obligatoire,
    l.poids,
    l.ordre,
    n.id AS norme_id,
    n.code AS norme_code,
    n.libelle AS norme_libelle,
    s.id AS service_id,
    s.nom AS service_nom
FROM dbo.lignes l
JOIN dbo.norme n ON n.id = l.norme_id
JOIN dbo.service s ON s.id = l.service_id;
GO
