---
trigger: glob
globs: "*.java, pom.xml, *.sql"
description: "Règles d'architecture hexagonale Java 25, Quarkus 3.x, isolation multi-client et RFC 7807 pour le backend uniform-app."
---

# Règles Backend (uniform-app) — Java 25, Quarkus & Architecture Hexagonale

1. Aucun fichier sous src/main/java/com/uniform/app/domain/** ne doit importer de classes issues de jakarta.persistence.*, io.quarkus.*, org.springframework.*, org.hibernate.* ou com.fasterxml.jackson.*.
2. Toute méthode de repository et tout cas d'utilisation manipulant un article, un stock, une commande B2C ou un bon de commande B2B doit recevoir et filtrer explicitement par UUID clientId.
3. Utiliser exclusivement BigDecimal avec setScale(2, RoundingMode.HALF_UP) pour les prix B2C et coûts B2B.
4. Exécuter la génération de PDF (OpenPDF) sur des Virtual Threads (@RunOnVirtualThread).
