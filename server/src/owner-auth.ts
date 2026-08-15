import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from 'node:crypto';
import type {Request, Response} from 'express';
import {prisma} from './db.js';

const sessionHours = 8;
const challengeMinutes = 10;
const cookieName = 'onebite_owner_session';
const challengeName = 'onebite_owner_challenge';
const cookiePath = '/api/v1/owner';
const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

const pendingChallenges = new Map<string, {userId: string; expiresAt: number}>();

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  return `${salt}:${scryptSync(password, salt, 64).toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64).toString('base64url');
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function encryptionKey() {
  const value = process.env.OWNER_TOTP_ENCRYPTION_KEY?.trim();
  if (!value) throw new Error('OWNER_TOTP_ENCRYPTION_KEY is required');
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error('OWNER_TOTP_ENCRYPTION_KEY must be either a base64-encoded 32-byte key or a 64-character hexadecimal key');
  }
  return key;
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

function decryptTotpSecret(value: string) {
  const [iv, tag, encrypted] = value.split('.');
  if (!iv || !tag || !encrypted) throw new Error('Invalid encrypted TOTP secret');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}

function base32Bytes(value: string) {
  const clean = value.replace(/[\s-]/g, '').toUpperCase();
  let bits = '';
  for (const character of clean) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Error('Invalid TOTP secret');
    bits += index.toString(2).padStart(5, '0');
  }
  const output: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    output.push(parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(output);
}

function totp(secret: string, step: number) {
  const key = base32Bytes(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const code =
    ((hmac[offset] & 127) << 24) |
    ((hmac[offset + 1] & 255) << 16) |
    ((hmac[offset + 2] & 255) << 8) |
    (hmac[offset + 3] & 255);
  return String(code % 1000000).padStart(6, '0');
}

export function generateTotp(secret: string, now = Date.now()) {
  return totp(secret, Math.floor(now / 30000));
}

export function validTotp(code: string, encryptedSecret: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const secret = decryptTotpSecret(encryptedSecret);
  const step = Math.floor(now / 30000);
  return [-1, 0, 1].some(offset =>
    timingSafeEqual(Buffer.from(code), Buffer.from(totp(secret, step + offset)))
  );
}

function readCookie(req: Request, name: string) {
  return req.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function setCookie(res: Response, name: string, value: string, maxAge: number) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: cookiePath,
    maxAge
  });
}

export async function beginOwnerLogin(email: string, password: string, res: Response) {
  const owner = await prisma.user.findFirst({where: {email, role: 'OWNER'}});
  if (!owner?.passwordHash || !owner.mfaEnabled || !owner.totpSecretEncrypted) return false;
  if (!verifyPassword(password, owner.passwordHash)) return false;

  const challenge = randomBytes(32).toString('base64url');
  const ttl = challengeMinutes * 60 * 1000;
  setCookie(res, challengeName, challenge, ttl);
  pendingChallenges.set(hash(challenge), {userId: owner.id, expiresAt: Date.now() + ttl});
  return true;
}

export async function completeOwnerLogin(code: string, req: Request, res: Response) {
  const raw = readCookie(req, challengeName);
  const challenge = raw && pendingChallenges.get(hash(raw));
  if (!raw || !challenge || challenge.expiresAt < Date.now()) return false;
  pendingChallenges.delete(hash(raw));

  const owner = await prisma.user.findUnique({where: {id: challenge.userId}});
  if (!owner || owner.role !== 'OWNER' || !owner.mfaEnabled || !owner.totpSecretEncrypted) return false;
  if (!validTotp(code, owner.totpSecretEncrypted)) return false;

  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: {
      userId: owner.id,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + sessionHours * 60 * 60 * 1000)
    }
  });
  setCookie(res, cookieName, token, sessionHours * 60 * 60 * 1000);
  res.clearCookie(challengeName, {path: cookiePath});
  return {id: owner.id, name: owner.name, email: owner.email};
}

export async function ownerFromRequest(req: Request) {
  const token = readCookie(req, cookieName);
  if (!token) return null;
  const session = await prisma.session.findUnique({where: {tokenHash: hash(token)}, include: {user: true}});
  if (!session || session.expiresAt <= new Date() || session.user.role !== 'OWNER') return null;
  return session.user;
}

export async function logoutOwner(req: Request, res: Response) {
  const token = readCookie(req, cookieName);
  if (token) await prisma.session.deleteMany({where: {tokenHash: hash(token)}});
  res.clearCookie(cookieName, {path: cookiePath});
}
