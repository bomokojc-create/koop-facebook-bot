/**
 * KOOP Facebook Messenger Bot — Vercel Serverless Function
 * Handles webhook verification (GET) and incoming messages (POST)
 * 100% free on Vercel Hobby plan (no external dependencies)
 */

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'koop_verify_token_2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// ─── Menu Options ──────────────────────────────────────────────────────────────────

const MENU_TEXT = `Bonjour et merci pour votre message. Voici nos liens principaux :

📢 Pour rejoindre notre chaîne WhatsApp et recevoir les opportunités d'EMPLOI en priorité :
https://whatsapp.com/channel/0029Vb7vn4J8fewxV924lW1p

🌐 Pour visiter le site KOOP Market :
https://koop-market.com

🎓 Pour voir les bourses d'études :
https://koop-market.com/#/scholarships

📰 Pour publier un article :
https://koop-market.com/#/articles

💼 Pour voir les offres d'emploi général :
https://koop-market.com/#/jobs

📚 Pour voir les formations et certifications :
https://koop-market.com/#/training

🛒 Pour accéder à la boutique KOOP :
https://koop-market.com/#/koop

✉️ Pour une demande particulière :
contact@koop-market.com

⚠️ Notez bien : nous ne donnons pas de travail, nous n'engageons pas, nous ne recrutons pas, mais nous partageons seulement des opportunités d'emploi.`;

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


// ─── Réponses automatiques par mots clés (sans IA) ──────────────────────────────────

const WHATSAPP_LINK = 'https://whatsapp.com/channel/0029Vb7vn4J8fewxV924lW1p';

const REPLY_HIRE = `Bonjour, je comprends tout à fait votre difficulté. Malheureusement, je ne suis pas recruteur : je recherche et partage des offres d'emploi pour aider notre communauté. Grâce à ces publications, plus de 100 jeunes ont déjà trouvé du travail. ✅

Pour consulter les opportunités, rejoignez notre chaîne WhatsApp :
${WHATSAPP_LINK} 📲`;

const REPLY_OPPORTUNITIES = `Bonjour, je ne connais pas nécessairement toutes les opportunités d'emploi disponibles. Le mieux est de consulter régulièrement la liste que nous publions sur notre chaîne WhatsApp 👉🏽
${WHATSAPP_LINK}`;

const REPLY_SCHOLARSHIP_HELP = `Bonjour, merci pour votre confiance. Je comprends votre démarche, et j'ai vraiment à cœur d'aider les jeunes Congolais à accéder aux études.

Je préfère être honnête avec vous : KOOP Market n'a pas encore de service d'accompagnement personnalisé pour les dossiers de bourse. Accompagner un dossier ne veut pas dire que la bourse est garantie, et je ne veux créer aucune fausse attente.

Ce que nous faisons déjà :
✅ Nous publions des bourses d'études : https://koop-market.com/#/scholarships
✅ Nous partageons des formations : https://koop-market.com/#/training
✅ Nous annonçons chaque nouvelle opportunité sur notre chaîne WhatsApp : ${WHATSAPP_LINK}

Nous travaillons à définir un processus d'accompagnement clair. Dès qu'il sera prêt, je ferai une vidéo pour l'annoncer. D'ici là, suivez nos publications et préparez vos documents : CV, relevés de notes, lettre de motivation et passeport. 🙏🏽`;

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(text) {
  const t = normalize(text);
  const test = (re) => re.test(t);

  // 1. Accompagnement pour une bourse (le mot bourse + une demande d'aide)
  if (t.includes('bourse') &&
      test(/accompagn|m'aider|aidez|\baide\b|dossier|candidature|postuler|suivi/)) {
    return 'SCHOLARSHIP_HELP';
  }
  // 2. Demande à être engagé
  if (test(/recrut|embauch|engag|cherche (un |du )?(emploi|travail)|besoin (d'un |de |d')?(emploi|travail)|veux (un )?(emploi|travail)|veux travailler|donn\w* moi (un )?(travail|emploi)|me prendre/)) {
    return 'HIRE';
  }
  // 3. Demande d'opportunités disponibles
  if (test(/opportunite|\boffres?\b|disponible|\bpostes?\b|y a[- ]t[- ]il/)) {
    return 'OPPORTUNITIES';
  }
  return null;
}

const INTENT_REPLIES = {
  HIRE: REPLY_HIRE,
  OPPORTUNITIES: REPLY_OPPORTUNITIES,
  SCHOLARSHIP_HELP: REPLY_SCHOLARSHIP_HELP
};


// ─── Menu puis note de l'assistant, chacun une seule fois par conversation ──────────
// Vercel est sans mémoire entre deux messages: on lit l'historique de la conversation
// sur Facebook pour savoir ce qui a déjà été envoyé.
const MENU_MARKER = 'Voici nos liens principaux';
const NOTE_MARKER = "assistant IA du professeur Kerryl Musungu";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const localState = new Map(); // filet de sécurité si l'API de l'historique échoue

const ASSISTANT_NOTE = `Bonjour, je suis l'assistant IA du professeur Kerryl Musungu. 🤖

La grande majorité de vos questions trouvent leur réponse dans les options que je vous ai envoyées plus haut. Merci de les consulter en premier.

Si vous avez une question particulière, merci de patienter : le professeur vous répondra dès que possible. 🙏🏽`;

async function getConversationState(senderId) {
  try {
    const url = `https://graph.facebook.com/v19.0/me/conversations?platform=messenger&user_id=${encodeURIComponent(senderId)}&fields=messages.limit(25){from,message,created_time}&access_token=${PAGE_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const messages = (data.data && data.data[0] && data.data[0].messages && data.data[0].messages.data) || [];
    const now = Date.now();
    const fromPage = messages.filter(m =>
      m.message && m.from && String(m.from.id) !== String(senderId) &&
      (now - new Date(m.created_time).getTime()) < COOLDOWN_MS
    );
    return {
      menuSent: fromPage.some(m => m.message.includes(MENU_MARKER)),
      noteSent: fromPage.some(m => m.message.includes(NOTE_MARKER))
    };
  } catch (err) {
    console.error('getConversationState error:', err.message);
    const s = localState.get(senderId);
    if (s && Date.now() - s.at < COOLDOWN_MS) return { menuSent: s.menuSent, noteSent: s.noteSent };
    return { menuSent: false, noteSent: false };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isConcludingMessage(text) {
  const normalized = text.trim().toLowerCase();
  return CONCLUDING_KEYWORDS.some(kw => normalized === kw);
}

function isMenuChoice(text) {
  const trimmed = text.trim();
  return null; // menu à liens directs: plus de choix par numéro
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

  // 2. Réponses automatiques par mots clés
  const intent = detectIntent(text);
  if (intent && INTENT_REPLIES[intent]) {
    await sendMessage(senderId, INTENT_REPLIES[intent]);
    return;
  }

  // 3. Repli: 1er message = menu complet, 2e message = note de l'assistant, ensuite silence
  const state = await getConversationState(senderId);
  if (!state.menuSent) {
    localState.set(senderId, { menuSent: true, noteSent: false, at: Date.now() });
    await sendMessage(senderId, MENU_TEXT);
    return;
  }
  if (!state.noteSent) {
    localState.set(senderId, { menuSent: true, noteSent: true, at: Date.now() });
    await sendMessage(senderId, ASSISTANT_NOTE);
    return;
  }
  // menu et note déjà envoyés: on ne répète rien
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
module.exports.detectIntent = detectIntent;
module.exports.INTENT_REPLIES = INTENT_REPLIES;
module.exports.handleMessage = handleMessage;
module.exports.getConversationState = getConversationState;
module.exports.ASSISTANT_NOTE = ASSISTANT_NOTE;
module.exports.MENU_TEXT = MENU_TEXT;
module.exports.RESPONSES = RESPONSES;
module.exports.CONCLUDING_KEYWORDS = CONCLUDING_KEYWORDS;
module.exports.POLITE_EXIT_REPLY = POLITE_EXIT_REPLY;
