# KOOP Facebook Messenger Bot

Chatbot Messenger 100% gratuit sur Vercel pour KOOP - Global Remote Talent Solution.

Menu interactif 5 options: Chaine, Infos, Emploi, Formation, Message particulier.

---

## Deploiement en 3 etapes

### Etape 1 - Deployer sur Vercel

1. Allez sur vercel.com et connectez votre compte GitHub
2. Importez ce repo: bomokojc-create/koop-facebook-bot
3. Ajoutez les variables d'environnement:
   - PAGE_ACCESS_TOKEN = (obtenu a l'etape 2)
   - VERIFY_TOKEN = koop_verify_token_2026
4. Cliquez Deploy - notez l'URL (ex: https://koop-facebook-bot.vercel.app)

### Etape 2 - Configurer l'App Facebook

1. Allez sur developers.facebook.com - Creer une App (type: Business)
2. Ajoutez le produit Messenger
3. Liez votre Page Facebook - Generez un Page Access Token
4. Copiez ce token dans les variables Vercel (etape 1)

### Etape 3 - Connecter le Webhook

1. Dans l'app Facebook - Messenger - Settings - Webhooks
2. Callback URL: https://votre-app.vercel.app/api/webhook
3. Verify Token: koop_verify_token_2026
4. Cochez: messages, messaging_postbacks
5. Cliquez Verify and Save

C'est fait! Le bot repond automatiquement aux messages sur votre Page.

---

## Test local

npm install
npm run dev
# webhook sur http://localhost:3000/api/webhook

## Structure

api/webhook.js - Serverless function (handler principal)
tests/webhook.test.js - Tests unitaires
vercel.json - Config Vercel
package.json
README.md

## Cout

0$ - Vercel Hobby (gratuit), Facebook Messenger API (gratuit).
