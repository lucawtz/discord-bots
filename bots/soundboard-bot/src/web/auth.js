const crypto = require('crypto');

// Discord-Login fuer das Dashboard: OAuth2 mit "identify"-Scope, die
// Server-Mitgliedschaft prueft der Bot selbst (kein "guilds"-Scope noetig).
// Session = HMAC-signiertes Cookie ohne Server-State — uebersteht Redeploys.
// Secret ist der API_KEY; wird der rotiert, sind alle Sessions ungueltig.

const SESSION_COOKIE = 'sb_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage
const STATE_TTL_MS = 10 * 60 * 1000;

// CSRF-States fuer laufende OAuth-Flows
const pendingStates = new Map();

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createSessionToken(user, secret) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    name: user.global_name || user.username,
    avatar: user.avatar,
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token, secret) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function getSessionUser(req, secret) {
  return verifySessionToken(getCookie(req, SESSION_COOKIE), secret);
}

function registerAuthRoutes(app, { client, sessionSecret }) {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const guildId = process.env.GUILD_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI
    || `http://localhost:${process.env.WEB_PORT || 3000}/api/auth/discord/callback`;
  const configured = Boolean(clientId && clientSecret && guildId);

  const cookieOpts = (req) => `Path=/; HttpOnly; SameSite=Lax${req.secure ? '; Secure' : ''}`;

  // --- Auth: Eingeloggter Nutzer (oder null) ---
  app.get('/api/auth/me', (req, res) => {
    const user = getSessionUser(req, sessionSecret);
    res.json({ configured, user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null });
  });

  // --- Auth: Redirect zu Discord ---
  app.get('/api/auth/discord', (req, res) => {
    if (!configured) return res.status(500).json({ error: 'Discord-Login nicht konfiguriert' });
    const state = crypto.randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now());
    for (const [s, t] of pendingStates) {
      if (Date.now() - t > STATE_TTL_MS) pendingStates.delete(s);
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify',
      state,
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  });

  // --- Auth: OAuth-Callback ---
  app.get('/api/auth/discord/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error || !code) return res.redirect('/?error=discord_denied');
    if (!state || !pendingStates.has(state)) return res.redirect('/?error=invalid_state');
    pendingStates.delete(state);

    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenRes.ok) throw new Error(`Token-Exchange fehlgeschlagen (HTTP ${tokenRes.status})`);
      const { access_token } = await tokenRes.json();

      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userRes.ok) throw new Error('User-Abruf fehlgeschlagen');
      const user = await userRes.json();

      const guild = client.guilds.cache.get(guildId);
      if (!guild) throw new Error('Bot ist nicht im konfigurierten Server');
      const isMember = await guild.members.fetch(user.id).then(() => true).catch(() => false);
      if (!isMember) return res.redirect('/?error=not_member');

      const token = createSessionToken(user, sessionSecret);
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_TTL_MS / 1000}; ${cookieOpts(req)}`);
      res.redirect('/');
    } catch (err) {
      console.error('Discord-OAuth-Fehler:', err.message);
      res.redirect('/?error=oauth_failed');
    }
  });

  // --- Auth: Logout ---
  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; ${cookieOpts(req)}`);
    res.json({ message: 'Abgemeldet' });
  });
}

module.exports = { registerAuthRoutes, getSessionUser };
