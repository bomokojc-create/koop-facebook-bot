/**
 * KOOP Facebook Messenger Bot — Vercel Serverless Function
 * Handles webhook verification (GET) and incoming messages (POST)
 * 100% free on Vercel Hobby plan (no external dependencies)
 */

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'koop_verify_token_2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// ─── Menu Options ──────────────────────────────────────────────────────────────────

const MENU_TEXT = `Veuillez choisir une option en tapant le numéro correspondant :\n\n1. 📢 Chaîne WhatsApp : Rejoindre notre communauté\n2. ℹ️ Infos : En savoir plus sur KOOP Market\n3. 💼 Emploi : Besoin d'un travail ?\n4. 🎓 Formation : Découvrir nos programmes\n5. 🛒 Boutique : Accéder à la boutique KOOP\n6. ✉️ Message particulier : Nous contacter par e-mail`;

const RESPONSES = {
  '1': {
    text: `Cliquez ici pour rejoindre la chaîne WhatsApp KOOP Market : https://whatsapp.com/channel/0029Vb7vn4J8fewxV924lW1p`
  },
  '2': {
    text: `Visitez notre site officiel pour tout savoir sur nous : https://koop-market.com`
  },
  '3': {
    text: `KOOP Market est une plateforme qui partage des opportunités pour vous aider dans votre recherche. Nous n'engageons pas directement, mais nous centralisons les meilleures offres vérifiées pour vous. Pour voir les offres disponibles, rejoignez notre chaîne WhatsApp (Option 1) ou visitez : https://koop-market.com/#/jobs`
  },
  '4': {
    text: `Découvrez nos formations et certifications : https://koop-market.com/#/services/training`
        },
  '5': {
    text: `Accédez à la boutique KOOP pour voir nos articles et services : https://koop-market.com/#/koop`
  },
  '6': {
    text: `Pour toute demande particulière, veuillez nous écrire directement à l'adresse suivante : contact@koop-market.com`
  }
};

// ─── Concluding / Politeness Keywords ───────────────────────────────────────────────
const CONCLUDING_KEYWORDS = [
  'merci', 'merci beaucoup', 'thanks', 'thank you', 'ok', 'okay',
  "d'accord", 'daccord', 'bien reçu', 'reçu', 'received', 'dkr'
];

const POLITE_EXIT_REPLY = 'Je vous en prie ! KOOP Market reste à votre disposition.';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isConcludingMessage(text) {
  const normalized = text.trim().toLowerCase();
  return CONCLUDING_KEYWORDS.some(kw => normalized === kw);
}

function isMenuChoice(text) {
  const trimmed = text.trim();
  return ['1', '2', '3', '4', '5', '6'].includes(trimmed) ? trimmed : null;
}

async function sendMessage(recipientId, text) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  const body = JSON.stringify({
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE'
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  return res.json();
}

async function handleMessage(senderId, messageText) {
  const text = messageText || '';
  
  // 1. Check concluding/politeness keywords
  if (isConcludingMessage(text)) {
    await sendMessage(senderId, POLITE_EXIT_REPLY);
    return;
  }

  // 2. Check if it's a menu number (1-6)
  const choice = isMenuChoice(text);
  if (choice && RESPONSES[choice]) {
    await sendMessage(senderId, RESPONSES[choice].text);
    return;
  }

  // 3. Fallback: send the full menu directly
  await sendMessage(senderId, MENU_TEXT);
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    const body = req.body;

    if (body.object === 'page') {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const messaging = entry.messaging || [];
        
        for (const event of messaging) {
          if (event.message && event.message.text) {
            await handleMessage(event.sender.id, event.message.text);
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
};

module.exports.isConcludingMessage = isConcludingMessage;
module.exports.isMenuChoice = isMenuChoice;
module.exports.handleMessage = handleMessage;
module.exports.MENU_TEXT = MENU_TEXT;
module.exports.RESPONSES = RESPONSES;
module.exports.CONCLUDING_KEYWORDS = CONCLUDING_KEYWORDS;
module.exports.POLITE_EXIT_REPLY = POLITE_EXIT_REPLY;
