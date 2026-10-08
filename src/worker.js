// Cloudflare Worker: serves the call page and connects the two people.
// Each call link maps to one "Room" (a Durable Object) that holds max 2 sockets.
import { DurableObject } from 'cloudflare:workers';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      const room = url.searchParams.get('room') || '';
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(room)) return new Response('Bad room', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
    }
    if (url.pathname === '/health') return new Response('ok');
    return new Response('Not found', { status: 404 }); // the page itself is served from /public
  },
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Answers the client's "ping" without waking the room: keeps the line open for free
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Drop members whose connection silently died (no ping for 70s)
    const now = Date.now();
    for (const s of this.ctx.getWebSockets('member')) {
      const t = this.ctx.getWebSocketAutoResponseTimestamp(s);
      if (t && now - t.getTime() > 70000) { try { s.close(1001, 'stale'); } catch {} }
    }
    const members = this.ctx.getWebSockets('member').filter((s) => s.readyState === 1);

    if (members.length >= 2) { // only two people, ever
      this.ctx.acceptWebSocket(server, ['rejected']);
      server.send(JSON.stringify({ type: 'full' }));
      server.close(1008, 'full');
    } else {
      this.ctx.acceptWebSocket(server, ['member']);
      members.forEach((s) => s.send(JSON.stringify({ type: 'peer-joined' })));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 65536) return;
    let m;
    try { m = JSON.parse(msg); } catch { return; }
    if (!['offer', 'answer', 'ice', 'bye', 'need-restart'].includes(m.type)) return;
    this.ctx.getWebSockets('member').forEach((s) => s !== ws && s.readyState === 1 && s.send(msg));
  }

  async webSocketClose(ws) {
    try { ws.close(1000); } catch {}
    if (!this.ctx.getTags(ws).includes('member')) return;
    this.ctx.getWebSockets('member').forEach((s) => {
      if (s !== ws && s.readyState === 1) s.send(JSON.stringify({ type: 'peer-left' }));
    });
  }

  async webSocketError(ws) {
    try { ws.close(1011); } catch {}
  }
                   }
