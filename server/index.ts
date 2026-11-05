import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { serveStatic } from './staticResponse.ts';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TempleRoom, RoomError } from './room.ts';

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.fbx': 'application/octet-stream', '.woff2': 'font/woff2' };
function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new RoomError(415, 'Yêu cầu phải dùng JSON.');
  let text = '';
  req.setEncoding('utf8');
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    text += chunk.toString();
    if (Buffer.byteLength(text) > 2048) { req.resume(); throw new RoomError(413, 'Yêu cầu quá dài.'); }
  }
  try { const value: unknown = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value as Record<string, unknown>; }
  catch { throw new RoomError(400, 'Yêu cầu chưa hợp lệ.'); }
}

export function createTempleServer(options: { room?: TempleRoom; dist?: string; autoSweep?: boolean } = {}) {
  const room = options.room ?? new TempleRoom();
  const dist = resolve(options.dist ?? 'dist');
  const streams = new Set<ServerResponse>();
  const rates = new Map<string, { at: number; count: number }>();
  const sweep = options.autoSweep === false ? null : setInterval(() => room.sweep(), 500);
  sweep?.unref();
  const broadcast = () => {
    const data = `event: room\ndata: ${JSON.stringify(room.snapshot())}\n\n`;
    for (const res of streams) { if (res.writableLength > 262144) res.destroy(); else res.write(data); }
  };
  const unsubscribe = room.subscribe(broadcast);
  const heartbeat = setInterval(() => {
    broadcast();
    for (const [ip, value] of rates) if (Date.now() - value.at > 60000) rates.delete(ip);
  }, 15000);
  heartbeat.unref();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname.startsWith('/api/room')) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (req.method === 'GET' && url.pathname === '/api/room') return json(res, 200, room.snapshot());
        if (req.method === 'GET' && url.pathname === '/api/room/events') {
          if (streams.size >= 256) return json(res, 503, { error: 'Chánh điện đang bận. Mời bạn thử lại.' });
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
          streams.add(res);
          res.write(`event: room\ndata: ${JSON.stringify(room.snapshot())}\n\n`);
          res.on('close', () => streams.delete(res));
          return;
        }
        if (req.method !== 'POST') return json(res, 405, { error: 'Phương thức không được hỗ trợ.' });
        if (req.headers.origin) {
          let allowed = false;
          try { allowed = new URL(req.headers.origin).host === req.headers.host; } catch { /* invalid origin */ }
          if (!allowed) throw new RoomError(403, 'Nguồn yêu cầu chưa hợp lệ.');
        }
        const bucket = url.pathname === '/api/room/heartbeat' ? 'heartbeat' : 'interaction';
        const ip = `${req.socket.remoteAddress ?? 'local'}:${bucket}`;
        const limit = rates.get(ip);
        if (!limit || Date.now() - limit.at > 60000) rates.set(ip, { at: Date.now(), count: 1 });
        else if (++limit.count > 180) throw new RoomError(429, 'Thao tác hơi nhanh. Mời bạn thử lại sau một chút.');
        const data = await body(req);
        if (url.pathname === '/api/room/join') return json(res, 200, room.join(data.name, data.appearance));
        const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
        if (!/^[a-f0-9]{64}$/.test(token)) throw new RoomError(401, 'Phiên an tọa chưa hợp lệ.');
        if (url.pathname === '/api/room/heartbeat') return json(res, 200, room.heartbeat(token));
        if (url.pathname === '/api/room/action') return json(res, 200, room.action(token, data.kind, data.requestId));
        if (url.pathname === '/api/room/leave') return json(res, 200, room.leave(token));
        return json(res, 404, { error: 'Không tìm thấy thao tác.' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405).end();
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(dist + sep) || !MIME[extname(file)]) return res.writeHead(404).end();
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) return res.writeHead(404).end('Not found. Run npm run build first.');
      serveStatic(req, res, file, info, MIME[extname(file)]);
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      json(res, error instanceof RoomError ? error.status : 500, { error: error instanceof RoomError ? error.message : 'Chưa xử lý được yêu cầu. Mời bạn thử lại.' });
    }
  });
  server.on('close', () => { if (sweep) clearInterval(sweep); clearInterval(heartbeat); unsubscribe(); streams.forEach(res => res.end()); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '127.0.0.1';
  createTempleServer().listen(port, host, () => console.log(`Đi Chùa Online · phòng chung: http://${host}:${port}/`));
}
