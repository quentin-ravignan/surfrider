/* SBA – connexion « duo en ligne » en pair à pair (WebRTC via PeerJS).
   Le serveur public de PeerJS sert seulement à mettre les deux téléphones en
   relation (code de partie à 4 lettres) ; ensuite les données passent
   directement d'un appareil à l'autre. Aucune donnée personnelle n'est envoyée. */

const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'sba7k2q-surfbeer-';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

let peer = null;
let conn = null;

function loadLib() {
  if (window.Peer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('peerjs'));
    document.head.appendChild(s);
  });
}
const newCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

export const Net = {
  role: null,        // 'host' | 'guest'
  code: '',
  connected: false,
  onMessage: null,   // (msg) => void
  onStatus: null,    // (state, detail) => void  state: 'waiting' | 'connected' | 'closed' | 'error'

  _status(s, d) { if (this.onStatus) this.onStatus(s, d); },
  _bind(c) {
    conn = c;
    c.on('open', () => { this.connected = true; this._status('connected'); });
    c.on('data', (d) => { if (this.onMessage) this.onMessage(d); });
    c.on('close', () => { if (conn === c) { this.connected = false; conn = null; this._status('closed'); } });
    c.on('error', () => this._status('error', 'conn'));
  },

  async host() {
    this.close();
    await loadLib();
    this.role = 'host';
    const tryOpen = (attempt) => {
      this.code = newCode();
      peer = new window.Peer(PREFIX + this.code, { debug: 0 });
      peer.on('open', () => this._status('waiting', this.code));
      peer.on('connection', (c) => {
        if (conn && conn.open) { c.on('open', () => c.close()); return; } // partie déjà complète
        this._bind(c);
      });
      peer.on('error', (e) => {
        if (e && e.type === 'unavailable-id' && attempt < 4) { peer.destroy(); tryOpen(attempt + 1); }
        else this._status('error', e && e.type);
      });
      peer.on('disconnected', () => { if (peer && !peer.destroyed) peer.reconnect(); });
    };
    tryOpen(0);
  },

  async join(code) {
    this.close();
    await loadLib();
    this.role = 'guest';
    this.code = String(code || '').trim().toUpperCase();
    peer = new window.Peer({ debug: 0 });
    peer.on('open', () => {
      const c = peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' });
      this._bind(c);
    });
    peer.on('error', (e) => this._status('error', e && e.type));
  },

  send(msg) { if (conn && conn.open) { try { conn.send(msg); } catch (e) { /* ignore */ } } },

  close() {
    this.connected = false;
    try { if (conn) conn.close(); } catch (e) { /* ignore */ }
    try { if (peer) peer.destroy(); } catch (e) { /* ignore */ }
    conn = null; peer = null; this.role = null; this.code = '';
  },
};
