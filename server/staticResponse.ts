import type { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream, type Stats } from 'node:fs';
import { createGzip } from 'node:zlib';

/** Validators apply to the source file; weak tags also cover gzip representations. */
export function serveStatic(req: IncomingMessage, res: ServerResponse, file: string, info: Stats, contentType: string) {
  const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
  const compressible = /^(text\/|application\/javascript|image\/svg)/.test(contentType);
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', info.mtime.toUTCString());
  if (compressible) res.setHeader('Vary', 'Accept-Encoding');
  const tags = req.headers['if-none-match'];
  const modifiedSince = req.headers['if-modified-since'];
  if (tags ? tags.split(',').some(tag => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag.slice(2))
    : modifiedSince && Math.floor(info.mtimeMs / 1000) <= Date.parse(modifiedSince) / 1000) {
    res.writeHead(304).end();
    return;
  }
  let start = 0, end = info.size - 1, partial = false;
  const range = req.headers.range;
  // Weak ETags cannot satisfy If-Range. A valid date can.
  const rawIfRange = req.headers['if-range'];
  const ifRange = Array.isArray(rawIfRange) ? rawIfRange.join(',') : rawIfRange;
  const allowRange = !ifRange || (Number.isFinite(Date.parse(ifRange)) && Math.floor(info.mtimeMs / 1000) <= Date.parse(ifRange) / 1000);
  res.setHeader('Accept-Ranges', 'bytes');
  if (range && allowRange && /^bytes=\d*-\d*$/.test(range)) {
    const [first, last] = range.slice(6).split('-');
    start = first ? Number(first) : Math.max(0, info.size - Number(last));
    end = first && last ? Math.min(Number(last), end) : end;
    if ((!first && !last) || start > end || start >= info.size || (!first && Number(last) === 0)) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end();
      return;
    }
    partial = true;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`);
  }
  const gzip = !partial && compressible && (req.headers['accept-encoding'] ?? '').split(',').some(value => {
    const [encoding, ...parameters] = value.trim().split(';');
    return encoding === 'gzip' && !parameters.some(p => /^\s*q=0(?:\.0*)?\s*$/.test(p));
  });
  if (gzip) res.setHeader('Content-Encoding', 'gzip');
  else res.setHeader('Content-Length', partial ? end - start + 1 : info.size);
  res.writeHead(partial ? 206 : 200);
  if (req.method === 'HEAD' || info.size === 0) { res.end(); return; }
  const source = createReadStream(file, partial ? { start, end } : undefined);
  source.on('error', () => res.destroy());
  res.on('close', () => source.destroy());
  if (gzip) {
    const encoder = createGzip();
    encoder.on('error', () => res.destroy());
    res.on('close', () => encoder.destroy());
    source.pipe(encoder).pipe(res);
  } else source.pipe(res);
}
