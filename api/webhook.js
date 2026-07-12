/**
 * KOOP Facebook Messenger Bot — Vercel Serverless Function
 * Handles webhook verification (GET) and incoming messages (POST)
 * 100% free on Vercel Hobby plan (no external dependencies)
 */

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'koop_verify_token_2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// ─── Menu Options ───────────────────────────────────────────────────────────────────

const MENU_TEXT = `Bonjour ! Bienvenue chez KOOP Market. Comment pouvons-nous vous aider aujourd'hui ?\n\n1. 📢 Chaîne WhatsApp : Rejoindre notre communauté\n2. ℹ️ Infos : En savoir plus sur KOOP Market\n3. 💼 Emploi : Besoin d'un travail ?\n4. 🎓 Formation : Découvrir nos programmes\n5. 🛒 Boutique : Accéder à la boutique KOOP\n6. ✉️ Message particulier : Parler à un conseiller`;

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
    text: `Votre message sera transmis à un conseiller KOOP Market. Veuillez décrire votre demande ci-dessous ou écrivez directement à : coop@amino.com`
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────────

function parseChoice(text) {
  const trimmed = text.trim().toLowerCase();
  
  // Direct number match
  if (['1', '2', '3', '4', '5', '6'].includes(trimmed)) return trimmed;
  
  // Keyword matching
  const keywords = {
    'chaine': '1', 'chaîne': '1', 'chain': '1', 'whatsapp': '1', 'communauté': '1', 'communaute': '1',
    'infos': '2', 'info': '2', 'about': '2',
    'emploi': '3', 'job': '3', 'jobs': '3', 'travail': '3',
    'formation': '4', 'training': '4', 'cours': '4', 'course': '4',
    'boutique': '5', 'shop': '5', 'magasin': '5',
    'message': '6', 'conseiller': '6', 'contact': '6', 'help': '6'
  };
  
  for (const [keyword, choice] of Object.entries(keywords)) {
    if (trimmed.includes(keyword)) return choice;
  }
  
  return null;
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
  
  // Show menu on greeting or "menu" command
  const menuTriggers = ['menu', 'start', 'hi', 'hello', 'bonjour', 'salut', 'hey', 'bonsoir'];
  if (menuTriggers.some(t => text.trim().toLowerCase() === t) || text.trim() === '') {
    await sendMessage(senderId, MENU_TEXT);
    return;
  }
  
  // Parse user choice
  const choice = parseChoice(text);
  if (choice && RESPONSES[choice]) {
    await sendMessage(senderId, RESPONSES[choice].text);
  } else {
    await sendMessage(senderId, `Message reçu ! Un conseiller KOOP Market vous répondra bientôt.\n\nTapez "menu" pour voir les options disponibles.`);
  }
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

module.exports.parseChoice = parseChoice;
module.exports.handleMessage = handleMessage;
module.exports.MENU_TEXT = MENU_TEXT;
module.exports.RESPONSES = RESPONSES;
