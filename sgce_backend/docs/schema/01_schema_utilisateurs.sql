-- ============================================================
-- SGCFC INM - Sprint 1
-- Schema Oracle : Table UTILISATEURS avec role fixe
-- Base cible : FREEPDB1 (utilisateur Matha)
-- ============================================================

-- Se positionner dans la bonne base avant toute operation admin
-- ALTER SESSION SET CONTAINER = FREEPDB1;

-- ------------------------------------------------------------
-- 1. Suppression prealable (developpement uniquement)
-- ------------------------------------------------------------
-- DROP TABLE utilisateurs CASCADE CONSTRAINTS;

-- ------------------------------------------------------------
-- 2. Creation de la table UTILISATEURS
-- ------------------------------------------------------------
CREATE TABLE utilisateurs (
    id              NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Champs d'authentification (compatibles AbstractUser Django)
    username        VARCHAR2(150)  NOT NULL,
    email           VARCHAR2(254)  NOT NULL,
    password        VARCHAR2(128)  NOT NULL,   -- hash Django (jamais en clair)

    first_name      VARCHAR2(150),
    last_name       VARCHAR2(150),

    -- Champ role : choix fixes, verifies par contrainte CHECK
    role            VARCHAR2(20)   NOT NULL,

    -- Indicateurs de compte (0 = false, 1 = true, convention Django)
    is_active       NUMBER(1)      DEFAULT 1 NOT NULL,
    is_staff        NUMBER(1)      DEFAULT 0 NOT NULL,
    is_superuser    NUMBER(1)      DEFAULT 0 NOT NULL,

    date_joined     TIMESTAMP      DEFAULT SYSTIMESTAMP NOT NULL,
    last_login      TIMESTAMP,

    -- Contraintes d'unicite
    CONSTRAINT uq_utilisateurs_username UNIQUE (username),
    CONSTRAINT uq_utilisateurs_email    UNIQUE (email),

    -- Contrainte de validite du role (RG14 : un utilisateur = un seul role)
    CONSTRAINT ck_utilisateurs_role CHECK (
        role IN ('ADMIN', 'AGENT_SDO', 'CHEF_ATELIER', 'MAGASINIER')
    ),

    -- Coherence is_active/is_staff/is_superuser (0 ou 1 uniquement)
    CONSTRAINT ck_utilisateurs_is_active    CHECK (is_active    IN (0,1)),
    CONSTRAINT ck_utilisateurs_is_staff     CHECK (is_staff     IN (0,1)),
    CONSTRAINT ck_utilisateurs_is_superuser CHECK (is_superuser IN (0,1))
);

-- ------------------------------------------------------------
-- 3. Index utiles (recherche frequente par role et par email)
-- ------------------------------------------------------------
CREATE INDEX idx_utilisateurs_role  ON utilisateurs (role);
CREATE INDEX idx_utilisateurs_email ON utilisateurs (email);

-- ------------------------------------------------------------
-- 4. Commentaires (documentation directement dans le schema)
-- ------------------------------------------------------------
COMMENT ON TABLE utilisateurs IS 'Comptes de la plateforme SGCFC : Administrateur, Agent SDO, Chef d''atelier, Magasinier';
COMMENT ON COLUMN utilisateurs.role IS 'Role unique de l''utilisateur : ADMIN, AGENT_SDO, CHEF_ATELIER ou MAGASINIER';
COMMENT ON COLUMN utilisateurs.password IS 'Hash du mot de passe genere par Django (jamais stocke en clair)';

-- ------------------------------------------------------------
-- 5. Verification rapide de la structure creee
-- ------------------------------------------------------------
-- DESC utilisateurs;
-- SELECT constraint_name, constraint_type, search_condition
--   FROM user_constraints
--  WHERE table_name = 'UTILISATEURS';

-- ------------------------------------------------------------
-- 6. Exemple d'insertion manuelle (a titre de test uniquement -
--    en pratique, Django gere la creation via createsuperuser
--    et le hachage du mot de passe)
-- ------------------------------------------------------------
-- INSERT INTO utilisateurs (username, email, password, first_name, last_name, role, is_staff, is_superuser)
-- VALUES ('matha', 'rgmphaione@gmail.com', '<hash>', 'Georges Mathaus', 'Ratsimbazafy', 'ADMIN', 1, 1);

COMMIT;