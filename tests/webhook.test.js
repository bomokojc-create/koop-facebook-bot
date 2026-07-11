const handler = require('../api/webhook');
const { parseChoice, MENU_TEXT, RESPONSES } = handler;

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({ json: () => Promise.resolve({ message_id: 'test123' }) })
);

// Helper to create mock req/res
function createMocks(method, query = {}, body = {}) {
  const req = { method, query, body };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    send(data) { this.body = data; return this; },
    json(data) { this.body = data; return this; }
  };
  return { req, res };
}

describe('Webhook Verification (GET)', () => {
  test('returns challenge on valid verify token', async () => {
    const { req, res } = createMocks('GET', {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'koop_verify_token_2026',
      'hub.challenge': 'test_challenge_123'
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('test_challenge_123');
  });

  test('returns 403 on invalid verify token', async () => {
    const { req, res } = createMocks('GET', {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong_token',
      'hub.challenge': 'test_challenge_123'
    });

    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('returns 403 when mode is not subscribe', async () => {
    const { req, res } = createMocks('GET', {
      'hub.mode': 'unsubscribe',
      'hub.verify_token': 'koop_verify_token_2026',
      'hub.challenge': 'test_challenge_123'
    });

    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });
});

describe('parseChoice', () => {
  test('parses direct numbers', () => {
    expect(parseChoice('1')).toBe('1');
    expect(parseChoice('2')).toBe('2');
    expect(parseChoice('3')).toBe('3');
    expect(parseChoice('4')).toBe('4');
    expect(parseChoice('5')).toBe('5');
  });

  test('parses keywords', () => {
    expect(parseChoice('chaîne')).toBe('1');
    expect(parseChoice('chaine')).toBe('1');
    expect(parseChoice('infos')).toBe('2');
    expect(parseChoice('emploi')).toBe('3');
    expect(parseChoice('job')).toBe('3');
    expect(parseChoice('formation')).toBe('4');
    expect(parseChoice('message')).toBe('5');
    expect(parseChoice('contact')).toBe('5');
  });

  test('handles case insensitivity', () => {
    expect(parseChoice('EMPLOI')).toBe('3');
    expect(parseChoice('Formation')).toBe('4');
    expect(parseChoice('INFO')).toBe('2');
  });

  test('returns null for unrecognized input', () => {
    expect(parseChoice('random text here')).toBeNull();
    expect(parseChoice('xyz')).toBeNull();
  });

  test('handles whitespace', () => {
    expect(parseChoice('  3  ')).toBe('3');
    expect(parseChoice(' emploi ')).toBe('3');
  });
});

describe('Incoming Messages (POST)', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  test('responds to menu triggers with menu text', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'user123' },
          message: { text: 'bonjour' }
        }]
      }]
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('EVENT_RECEIVED');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.recipient.id).toBe('user123');
    expect(callBody.message.text).toContain('Choisissez une option');
  });

  test('responds to number choice with correct content', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'user456' },
          message: { text: '3' }
        }]
      }]
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.message.text).toContain('Offres d\'emploi');
  });

  test('responds to keyword choice', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'user789' },
          message: { text: 'formation' }
        }]
      }]
    });

    await handler(req, res);
    
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.message.text).toContain('Formations & Certifications');
  });

  test('sends fallback for unrecognized messages', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'user000' },
          message: { text: 'je cherche un developpeur python' }
        }]
      }]
    });

    await handler(req, res);
    
    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.message.text).toContain('Message recu');
  });

  test('returns 404 for non-page objects', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'instagram',
      entry: []
    });

    await handler(req, res);
    expect(res.statusCode).toBe(404);
  });

  test('handles multiple messages in one entry', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'page',
      entry: [{
        messaging: [
          { sender: { id: 'userA' }, message: { text: 'menu' } },
          { sender: { id: 'userB' }, message: { text: '1' } }
        ]
      }]
    });

    await handler(req, res);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('ignores events without message text', async () => {
    const { req, res } = createMocks('POST', {}, {
      object: 'page',
      entry: [{
        messaging: [{
          sender: { id: 'userX' },
          delivery: { watermark: 123456 }
        }]
      }]
    });

    await handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('Method handling', () => {
  test('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks('PUT');
    await handler(req, res);
    expect(res.statusCode).toBe(405);
  });
});
