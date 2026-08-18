import request from 'supertest';
import type {Express} from 'express';
import {prisma} from '../db.js';
import {encryptTotpSecret, generateTotp, hashPassword} from '../owner-auth.js';

/**
 * Signs a throwaway owner in through the real login flow and hands back the
 * session cookie, so admin tests exercise the same guard the dashboard does.
 * Each file passes its own email: the suite runs files serially against one
 * database, and a shared owner would have its rows deleted mid-run.
 */
const secret = 'JBSWY3DPEHPK3PXP';
const password = 'a-strong-owner-password';

export async function signInOwner(app: Express, email: string) {
  process.env.OWNER_TOTP_ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString('base64');

  const owner = {
    name: 'Admin Test Owner',
    role: 'OWNER' as const,
    passwordHash: hashPassword(password),
    totpSecretEncrypted: encryptTotpSecret(secret),
    mfaEnabled: true
  };
  await prisma.user.upsert({where: {email}, update: owner, create: {email, ...owner}});

  const login = await request(app).post('/api/v1/owner/auth/login').send({email, password});
  const challenge = login.headers['set-cookie']?.[0];
  const verified = await request(app)
    .post('/api/v1/owner/auth/verify-totp')
    .set('Cookie', challenge!)
    .send({code: generateTotp(secret)});

  const cookie = verified.headers['set-cookie']?.[0];
  if (!cookie) throw new Error(`Owner sign-in failed: ${JSON.stringify(verified.body)}`);
  return cookie;
}

export async function removeOwner(email: string) {
  const user = await prisma.user.findUnique({where: {email}});
  if (!user) return;
  await prisma.session.deleteMany({where: {userId: user.id}});
  await prisma.mfaChallenge.deleteMany({where: {userId: user.id}});
  await prisma.user.delete({where: {id: user.id}});
}
