/**
 * KOOP Facebook Messenger Bot — Vercel Serverless Function
 * Handles webhook verification (GET) and incoming messages (POST)
 * 100% free on Vercel Hobby plan (no external dependencies)
 */

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'koop_verify_token_2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// ─── Menu Options ────────────────────────────────────────────────────────────

const MENU_TEXT = `👋 Bienvenue chez *KOOP - Global Remote Talent Solution* !\n\nChoisissez une option :\n\n1️⃣ Chaîne — Rejoindre notre chaîne\n2️⃣ Infos — En savoir plus sur KOOP\n3️⃣ Emploi — Offres d'emploi disponibles\n4️⃣ Formation — Formations & certifications\n5️⃣ Message particulier — Parler à un conseiller`;

const RESPONSES = {
  '1': {
    text: `📡 *Chaîne KOOP*\n\nRejoignez notre chaîne pour recevoir les dernières offres et opportunités en temps réel :\n\n🔗 https://whatsapp.com/channel/0029Vb0VPbdJ3jUMIethzb0R\n\nTapez "menu" pour revenir au menu principal.`
  },
  '2': {
    text: `ℹ️ *À propos de KOOP*\n\nKOOP - Global Remote Talent Solution est une plateforme qui connecte les talents africains et internationaux aux opportunités de travail à distance.\n\n🌍 100% Remote\n💼 Emplois vérifiés\n📚 Formations certifiantes\n🤝 Accompagnement personnalisé\n\nTapez "menu" pour revenir au menu principal.`
  },
  '3': {
    text: `💼 *Offres d'emploi*\n\nVoici nos catégories d'emploi disponibles :\n\n• Data & Analytics\n• Développement Web/Mobile\n• Marketing Digital\n• Service Client\n• Rédaction & Traduction\n• Administration\n\n📩 Envoyez votre CV à : kerryllmusungu@gmail.com\n\nTapez "menu" pour revenir au menu principal.`
  },
  '4': {
    text: `📚 *Formations & Certifications*\n\nNos formations disponibles :\n\n• Machine Learning & IA\n• Data Science avec Python/PySpark\n• Développement Full-Stack\n• Marketing Digital\n• Gestion de projet (PMP, Agile)\n\n💰 Bourses disponibles pour les membres actifs.\n\nTapez "menu" pour revenir au menu principal.`
  },
  '5': {
    text: `✉️ *Message particulier*\n\nVotre message sera transmis à un conseiller KOOP. Veuillez décrire votre demande et nous vous répondrons dans les plus brefs délais.\n\n📧 Ou écrivez directement à : kerryllmusungu@gmail.com\n\nTapez "menu" pour revenir au menu principal.`
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseChoice(text) {
  const trimmed = text.trim().toLowerCase();
  
  // Direct number match
  if (['1', '2', '3', '4', '5'].includes(trimmed)) return trimmed;
  
  // Keyword matching
  const keywords = {
    'chaine': '1', 'chaîne': '1', 'chain': '1',
    'infos': '2', 'info': '2', 'about': '2',
    'emploi': '3', 'job': '3', 'jobs': '3', 'travail': '3',
    'formation': '4', 'training': '4', 'cours': '4', 'course': '4',
    'message': '5', 'conseiller': '5', 'contact': '5', 'help': '5'
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
    await sendMessage(senderId, `Message recu ! Un conseiller KOOP vous repondra bientot.\n\nTapez "menu" pour voir les options disponibles.`);
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
