// Demo: two users chat in real time over Socket.IO (JWT protected).
// Usage: start the server (npm start) in one terminal, then run `npm run demo` in another.
const { io } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const post = (path, body) =>
  fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

async function getToken(name, email, password) {
  let res = await post('/api/auth/signup', { name, email, password });
  if (!res.token) res = await post('/api/auth/login', { email, password }); // already registered
  if (!res.token) throw new Error(`Could not authenticate ${email}: ${res.message}`);
  return res.token;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const tokenA = await getToken('Alice', 'alice.demo@test.com', 'demo1234');
  const tokenB = await getToken('Bob', 'bob.demo@test.com', 'demo1234');

  // A connection without a valid JWT is rejected
  const bad = io(BASE, { auth: { token: 'invalid-token' } });
  bad.on('connect_error', (e) => console.log('[Unauthorized client] rejected ->', e.message));

  const alice = io(BASE, { auth: { token: tokenA } });
  const bob = io(BASE, { auth: { token: tokenB } });

  alice.on('system', (m) => console.log('[Alice] system:', m));
  bob.on('system', (m) => console.log('[Bob]   system:', m));
  alice.on('chat_message', (m) => console.log(`[Alice] received -> ${m.sender}: ${m.text}`));
  bob.on('chat_message', (m) => console.log(`[Bob]   received -> ${m.sender}: ${m.text}`));
  bob.on('typing', (t) => t.isTyping && console.log(`[Bob]   sees: ${t.user} is typing...`));
  alice.on('online_users', (list) => console.log('[Online users]', list.join(', ')));

  await wait(1000);
  alice.emit('typing', true);
  await wait(500);
  alice.emit('chat_message', 'Hello Bob, this is Alice!');
  await wait(700);
  bob.emit('chat_message', 'Hi Alice, Socket.IO chat is working.');
  await wait(700);
  alice.emit('chat_message', 'JWT auth + real-time messaging done.');
  await wait(1000);

  alice.disconnect();
  bob.disconnect();
  bad.disconnect();
  await wait(300);
  console.log('Demo finished.');
  process.exit(0);
})().catch((e) => {
  console.error('Demo failed. Is the server running?', e.message);
  process.exit(1);
});
