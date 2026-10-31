GEMINI.md — Constitution Technique & Métier du Projet (uniform-app)

> Directive Système pour Agents IA : Ce fichier définit les règles d'architecture, de domaine métier et de qualité logicielle non négociables du projet uniform-app. Toute génération ou modification de code DOIT respecter strictement ces directives.

1. Contexte Métier, Isolation & Machine à États (B2C <-> B2B)

1.1. Multi-Tenancy Logique & Isolation par Client

⚬ Cloisonnement strict par Client (clientId) : Chaque client B2B/B2C configuré par l'ADMIN possède :

	⚬ Ses informations propres (nom, adresse, logo) et sa Quantité Minimale de Commande (MOQ > 0).

	⚬ Son Catalogue d'articles dédié : type/style de vêtement, références couleurs, photos des visuels (face/dos/emplacements), Prix de vente unitaire B2C et Coût d'achat unitaire B2B.

	⚬ Son Stock dédié (ClientStock) : ventilé par catalogItemId, gender et size.

⚬ Règle d'or d'isolation : Le stock, le catalogue et les commandes d'un Client A ne doivent JAMAIS être agrégés, partagés ou consommés par un Client B. Toute requête SQL/JPQL métier DOIT filtrer explicitement par client_id.

1.2. Référentiel des Genres & Grilles de Tailles

⚬ Genres (Gender) : MEN, WOMEN, UNISEX, KIDS.

⚬ Tailles (Size) :

	⚬ Grille Adulte (applicable à MEN, WOMEN, UNISEX) : XS, S, M, L, XL, XXL, XXXL.

	⚬ Grille Enfant (applicable uniquement à KIDS) : AGE_2, AGE_4, AGE_6, AGE_8, AGE_10, AGE_12, AGE_14.

⚬ Invariant de domaine : Il est INTERDIT d'associer une taille Adulte au genre KIDS ou une taille Enfant aux genres MEN, WOMEN ou UNISEX.

1.3. Règles Métier B2C (Encaissement Espèces & Prise de Commande)

⚬ Paiement exclusivement en espèces au comptant :

	⚬ Aucun acompte, aucun paiement partiel, aucun statut de paiement en attente.

	⚬ Toute ligne ajoutée à une commande B2C est immédiatement réputée payée intégralement en espèces.

	⚬ Calcul du montant de la ligne : lineCashAmount = quantity * b2cUnitPrice.

⚬ Confirmation irréversible & Reçu PDF :

	⚬ L'API d'ajout de ligne B2C DOIT exiger le booléen explicite cashPaymentConfirmed = true et irreversibilityAcknowledged = true.

	⚬ Toute création de ligne est irréversible pour un USER et déclenche la génération d'un Reçu de Paiement PDF immuable contenant les coordonnées de l'acheteur (nom, téléphone, email), le détail (article, genre, taille, quantité) et le montant acquitté en espèces.

1.4. Machine à États Synchronisée (B2C -> B2B -> Stock -> B2C)

⚬ Cycle de vie d'une Commande B2C (B2cOrderStatus) :

    1. IN_PROGRESS (En cours) : Seul état autorisant l'ajout de lignes d'achat B2C.

    2. IN_PRODUCTION (En fabrication) :

		⚬ Condition de garde : sum(Quantités Lignes B2C) >= MOQ du Client.

		⚬ Effet B2C : Verrouillage définitif et irréversible de la commande B2C. Si de nouveaux acheteurs se présentent pour ce client, une nouvelle commande IN_PROGRESS DOIT être créée.

		⚬ Effet B2B : Création automatique d'un Bon de Commande Fournisseur (B2bPurchaseOrder) au statut DRAFT, pré-rempli avec les quantités agrégées par article/genre/taille issues de la commande B2C.

    3. IN_DELIVERY (En livraison) :

		⚬ Condition de garde : Le B2bPurchaseOrder associé DOIT être au statut RECEIVED (marchandise réceptionnée et stock client crédité).

		⚬ Effet B2C : Débloque le pointage de remise individuelle sur chaque ligne de la commande (B2cOrderLineStatus : PENDING_PICKUP -> DELIVERED).

    4. DELIVERED (Livré) :

		⚬ Transition 100% automatique : Dès que la dernière ligne PENDING_PICKUP d'une commande B2C passe à DELIVERED (soit 100% des lignes livrées), la commande globale bascule automatiquement au statut DELIVERED dans la même transaction atomique.

⚬ Cycle de vie du Bon de Commande Fournisseur B2B (B2bOrderStatus) :

    1. DRAFT : L'ADMIN visualise les spécifications techniques du client (style, couleurs, visuels), la quantité demandée par le B2C, et saisit la quantité définitive à commander au fournisseur (finalQuantity) pour chaque variante.

    2. ORDERED : Calcul figé du coût fournisseur totalB2bCost = sum(finalQuantity * b2bUnitCost) et génération du PDF du Bon de Commande Fournisseur.

    3. RECEIVED : Validation de la réception fournisseur par l'ADMIN. Incrémente immédiatement le ClientStock de chaque variante reçue et débloque la transition IN_DELIVERY de la commande B2C rattachée.

1.5. Contrôle d'Accès Basé sur les Rôles (RBAC)

⚬ ROLE_USER (Opérateur Comptoir) :

	⚬ Autorisé : Initialiser une commande B2C (IN_PROGRESS), ajouter des lignes (après confirmation d'encaissement espèces) et télécharger le reçu PDF, consulter les commandes B2C en cours, le total encaissé et l'historique, pointer une ligne individuelle à DELIVERED lorsque la commande parente est IN_DELIVERY.

	⚬ Interdit (403 Forbidden) : Toute modification de catalogue/client/MOQ, tout accès aux prix d'achat/coûts B2B, tout accès au module B2B, toute transition de statut global d'une commande B2C (IN_PRODUCTION, IN_DELIVERY).

⚬ ROLE_ADMIN (Super-Utilisateur) :

	⚬ Autorisé : Tous les droits sans exception (ROLE_USER inclus + gestion des clients/MOQ/catalogues/styles/visuels/prix, transitions d'états B2C sous respect des gardes métier, édition des quantités définitives B2B, réception des stocks fournisseurs, administration des comptes).

2. Stack Technique & Versions Cibles

⚬ Langage & Runtime Backend :

	⚬ Java 25 (Compilation avec --release 25). Exploitation native des record, Sealed Classes/Interfaces, Pattern Matching for switch, Unnamed Variables (_), et Virtual Threads (@RunOnVirtualThread pour les appels bloquants I/O et génération PDF).

	⚬ Quarkus 3.x exécuté sur Quarkus REST (RESTEasy Reactive).

	⚬ Sécurité : SmallRye JWT / Quarkus Security (@RolesAllowed({"ADMIN", "USER"})).

	⚬ Génération PDF : OpenPDF (reçus d'encaissement espèces B2C et bons de commande fournisseurs B2B).

⚬ Base de Données & Persistance :

	⚬ MySQL 8.4 LTS (Moteur InnoDB, charset utf8mb4, collation utf8mb4_0900_ai_ci).

	⚬ ORM & Migrations : Hibernate ORM with Panache + Flyway (schéma géré exclusivement par scripts versionnés V1__*.sql, quarkus.hibernate-orm.database.generation=validate).

	⚬ Types Financiers : Stockage exclusif en DECIMAL(12, 2) côté MySQL et manipulation exclusive en BigDecimal côté Java (interdiction absolue de float ou double).

⚬ Frontend :

	⚬ Angular 21 : Architecture 100% Standalone Components, mode Zoneless (provideZonelessChangeDetection()), Signals API de bout en bout.

	⚬ Outillage UI : TypeScript 5.8+ en mode strict: true, Tailwind CSS, Reactive Forms typés.

3. Architecture & Design Patterns

3.1. Backend : Architecture Hexagonale Stricte (Ports & Adapters)

Le code backend (package racine com.uniform.app) DOIT être organisé en 4 couches concentriques avec contrôle strict des dépendances (vérifié par ArchUnit) :

⚬ domain (Cœur Métier Pur) : ZÉRO import issu de Quarkus, Spring, Hibernate/JPA, Jackson ou Jakarta REST. Uniquement la bibliothèque standard Java 25.

⚬ application (Orchestration & Use Cases) : Implémente domain.port.in.* et gère @Transactional.

⚬ infrastructure (Adaptateurs Secondaires) : persistence (Entités JPA + Mappers explicites), pdf (OpenPDF), storage.

⚬ api (Adaptateurs Primaires REST) : Contrôleurs REST et DTOs en record Java avec Jakarta Bean Validation.

3.2. Frontend : Architecture Angular 21 Pilotée par les Signals

⚬ Zéro Zone.js & OnPush intégral : Tous les composants fonctionnent avec provideZonelessChangeDetection().

⚬ Primitives Réactives Obligatoires : input(), input.required(), output(), model(), signal(), computed(), linkedSignal(), @if, @for, @switch.

4. Conventions de Code, Gestion des Erreurs (RFC 7807) & Exigences de Tests

⚬ Langue du code : Code source, schémas SQL et endpoints REST 100% en anglais ; libellés UI et PDF en français.

⚬ Concurrence & Audit : Colonne version BIGINT NOT NULL DEFAULT 0 (@Version) et traçabilité created_by_user_id / created_at (UTC Instant).

⚬ Erreurs RFC 7807 (application/problem+json) :

	⚬ CashPaymentNotConfirmedException -> 400 (CASH_CONFIRMATION_REQUIRED)

	⚬ InvalidGenderSizeCombinationException -> 400 (INVALID_GENDER_SIZE)

	⚬ OrderLockedException -> 409 (ORDER_IMMUTABLE)

	⚬ InsufficientClientStockException -> 409 (INSUFFICIENT_CLIENT_STOCK)

	⚬ B2bStockNotReceivedException -> 409 (B2B_STOCK_NOT_RECEIVED)

	⚬ MoqNotReachedException -> 422 (MOQ_NOT_REACHED)

	⚬ Violation RBAC -> 403 (INSUFFICIENT_PRIVILEGES)

⚬ Tests Obligatoires : JUnit 5 + AssertJ (>= 95% sur domain), ArchUnit, et @QuarkusTest avec Testcontainers (mysql:8.4) (H2 interdit)
