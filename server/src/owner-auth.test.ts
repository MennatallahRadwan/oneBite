import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import request from 'supertest';
import {prisma} from './db.js';
import {createApp} from './app.js';
import {encryptTotpSecret,generateTotp,hashPassword} from './owner-auth.js';

process.env.OWNER_TOTP_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
const app=createApp(),email='owner-test@onebite.local',secret='JBSWY3DPEHPK3PXP';
beforeAll(async()=>{await prisma.user.upsert({where:{email},update:{name:'Test Owner',role:'OWNER',passwordHash:hashPassword('a-strong-owner-password'),totpSecretEncrypted:encryptTotpSecret(secret),mfaEnabled:true},create:{email,name:'Test Owner',role:'OWNER',passwordHash:hashPassword('a-strong-owner-password'),totpSecretEncrypted:encryptTotpSecret(secret),mfaEnabled:true}})});
afterAll(async()=>{const user=await prisma.user.findUnique({where:{email}});if(user){await prisma.session.deleteMany({where:{userId:user.id}});await prisma.user.delete({where:{id:user.id}})}});
describe('owner authentication',()=>{it('requires password and TOTP before returning orders',async()=>{expect((await request(app).get('/api/v1/owner/orders')).status).toBe(401);const login=await request(app).post('/api/v1/owner/auth/login').send({email,password:'a-strong-owner-password'});expect(login.status).toBe(202);const cookie=login.headers['set-cookie']?.[0];expect(cookie).toBeTruthy();const verified=await request(app).post('/api/v1/owner/auth/verify-totp').set('Cookie',cookie!).send({code:generateTotp(secret)});expect(verified.status).toBe(200);const sessionCookie=verified.headers['set-cookie']?.[0];const orders=await request(app).get('/api/v1/owner/orders').set('Cookie',sessionCookie!);expect(orders.status).toBe(200);expect(Array.isArray(orders.body.items)).toBe(true)})});
