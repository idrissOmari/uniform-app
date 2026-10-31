# Cadrage de Projet : Application uniform-app (Gestion de Commandes B2C / B2B)

1. Prise de commande sécurisée (B2C) : Encaissement en espèces immédiat avec écran de confirmation irréversible et impression de reçu PDF.
2. Passerelle de fabrication (B2C -> B2B) : Dès que le quota minimal (MOQ) est atteint et que l'ADMIN passe la commande en "En fabrication", celle-ci bascule dans l'espace B2B pour éditer le Bon de Commande Fournisseur (quantités définitives, rappel style/couleurs/visuels et coût fournisseur).
3. Passerelle logistique (B2B -> B2C) : La réception de la commande fournisseur incrémente le stock client et débloque le passage de la commande B2C en "En livraison". Chaque ligne est pointée "Livré" au retrait, et la commande globale passe automatiquement à "Livré" dès que 100% des lignes sont livrées.
