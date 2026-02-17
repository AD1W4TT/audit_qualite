-- phpMyAdmin SQL Dump
-- version 4.2.7.1
-- http://www.phpmyadmin.net
--
-- Client :  localhost
-- Généré le :  Ven 14 Novembre 2025 à 11:06
-- Version du serveur :  5.6.20-log
-- Version de PHP :  5.4.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Base de données :  `audit_app`
--

-- --------------------------------------------------------

--
-- Structure de la table `audit`
--

CREATE TABLE IF NOT EXISTS `audit` (
`id` int(11) NOT NULL,
  `norme_id` int(11) NOT NULL,
  `date_audit` date NOT NULL,
  `auditeur` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope` text COLLATE utf8mb4_unicode_ci,
  `statut` enum('BROUILLON','EN_COURS','CLOTURE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BROUILLON'
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=13 ;

-- --------------------------------------------------------

--
-- Structure de la table `audit_resultat`
--

CREATE TABLE IF NOT EXISTS `audit_resultat` (
`id` int(11) NOT NULL,
  `audit_id` int(11) NOT NULL,
  `ligne_id` int(11) NOT NULL,
  `statut` enum('CONFORME','NON_CONFORME','NA','OBS') COLLATE utf8mb4_unicode_ci NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `commentaire` text COLLATE utf8mb4_unicode_ci,
  `preuve` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=20 ;

-- --------------------------------------------------------

--
-- Structure de la table `lignes`
--

CREATE TABLE IF NOT EXISTS `lignes` (
`id` int(11) NOT NULL,
  `norme_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intitule` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `obligatoire` tinyint(1) NOT NULL DEFAULT '1',
  `poids` decimal(6,2) DEFAULT NULL,
  `ordre` int(11) DEFAULT NULL
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=23 ;

-- --------------------------------------------------------

--
-- Structure de la table `norme`
--

CREATE TABLE IF NOT EXISTS `norme` (
`id` int(11) NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `libelle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date_norme` date DEFAULT NULL
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=4 ;

-- --------------------------------------------------------

--
-- Structure de la table `service`
--

CREATE TABLE IF NOT EXISTS `service` (
`id` int(11) NOT NULL,
  `nom` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=6 ;

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur`
--

CREATE TABLE IF NOT EXISTS `utilisateur` (
`id` int(11) NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('USER','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB  DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=5 ;

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `v_lignes_detail`
--
CREATE TABLE IF NOT EXISTS `v_lignes_detail` (
`id` int(11)
,`code` varchar(50)
,`intitule` varchar(255)
,`obligatoire` tinyint(1)
,`poids` decimal(6,2)
,`ordre` int(11)
,`norme_id` int(11)
,`norme_code` varchar(50)
,`norme_libelle` varchar(255)
,`service_id` int(11)
,`service_nom` varchar(150)
);
-- --------------------------------------------------------

--
-- Structure de la vue `v_lignes_detail`
--
DROP TABLE IF EXISTS `v_lignes_detail`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_lignes_detail` AS select `l`.`id` AS `id`,`l`.`code` AS `code`,`l`.`intitule` AS `intitule`,`l`.`obligatoire` AS `obligatoire`,`l`.`poids` AS `poids`,`l`.`ordre` AS `ordre`,`n`.`id` AS `norme_id`,`n`.`code` AS `norme_code`,`n`.`libelle` AS `norme_libelle`,`s`.`id` AS `service_id`,`s`.`nom` AS `service_nom` from ((`lignes` `l` join `norme` `n` on((`n`.`id` = `l`.`norme_id`))) join `service` `s` on((`s`.`id` = `l`.`service_id`)));

--
-- Index pour les tables exportées
--

--
-- Index pour la table `audit`
--
ALTER TABLE `audit`
 ADD PRIMARY KEY (`id`), ADD KEY `idx_audit_norme` (`norme_id`), ADD KEY `idx_audit_statut` (`statut`);

--
-- Index pour la table `audit_resultat`
--
ALTER TABLE `audit_resultat`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `uk_audit_ligne` (`audit_id`,`ligne_id`), ADD KEY `idx_res_audit` (`audit_id`), ADD KEY `idx_res_ligne` (`ligne_id`);

--
-- Index pour la table `lignes`
--
ALTER TABLE `lignes`
 ADD PRIMARY KEY (`id`), ADD KEY `idx_lignes_norme` (`norme_id`), ADD KEY `idx_lignes_service` (`service_id`), ADD KEY `idx_lignes_norme_ordre` (`norme_id`,`ordre`);

--
-- Index pour la table `norme`
--
ALTER TABLE `norme`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `code` (`code`);

--
-- Index pour la table `service`
--
ALTER TABLE `service`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `nom` (`nom`);

--
-- Index pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT pour les tables exportées
--

--
-- AUTO_INCREMENT pour la table `audit`
--
ALTER TABLE `audit`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=13;
--
-- AUTO_INCREMENT pour la table `audit_resultat`
--
ALTER TABLE `audit_resultat`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=20;
--
-- AUTO_INCREMENT pour la table `lignes`
--
ALTER TABLE `lignes`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=23;
--
-- AUTO_INCREMENT pour la table `norme`
--
ALTER TABLE `norme`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=4;
--
-- AUTO_INCREMENT pour la table `service`
--
ALTER TABLE `service`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=6;
--
-- AUTO_INCREMENT pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=5;
--
-- Contraintes pour les tables exportées
--

--
-- Contraintes pour la table `audit`
--
ALTER TABLE `audit`
ADD CONSTRAINT `fk_audit_norme` FOREIGN KEY (`norme_id`) REFERENCES `norme` (`id`) ON UPDATE CASCADE;

--
-- Contraintes pour la table `audit_resultat`
--
ALTER TABLE `audit_resultat`
ADD CONSTRAINT `fk_res_audit` FOREIGN KEY (`audit_id`) REFERENCES `audit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `fk_res_ligne` FOREIGN KEY (`ligne_id`) REFERENCES `lignes` (`id`) ON UPDATE CASCADE;

--
-- Contraintes pour la table `lignes`
--
ALTER TABLE `lignes`
ADD CONSTRAINT `fk_lignes_norme` FOREIGN KEY (`norme_id`) REFERENCES `norme` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `fk_lignes_service` FOREIGN KEY (`service_id`) REFERENCES `service` (`id`) ON UPDATE CASCADE;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
