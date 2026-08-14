import 'dotenv/config';
import {prisma} from '../src/db.js';
import {encryptTotpSecret,hashPassword} from '../src/owner-auth.js';

const email=process.env.OWNER_EMAIL?.trim().toLowerCase(),password=process.env.OWNER_PASSWORD,totpSecret=process.env.OWNER_TOTP_SECRET?.replace(/[\s-]/g,'').toUpperCase();
if(!email||!password||!totpSecret){throw new Error('Set OWNER_EMAIL, OWNER_PASSWORD, and OWNER_TOTP_SECRET in .env before running this command.');}
if(password.length<12)throw new Error('OWNER_PASSWORD must be at least 12 characters.');
const owner=await prisma.user.upsert({where:{email},update:{name:'One Bite Owner',role:'OWNER',passwordHash:hashPassword(password),totpSecretEncrypted:encryptTotpSecret(totpSecret),mfaEnabled:true},create:{email,name:'One Bite Owner',role:'OWNER',passwordHash:hashPassword(password),totpSecretEncrypted:encryptTotpSecret(totpSecret),mfaEnabled:true}});
console.log(`Owner ${owner.email} is ready. Add this TOTP secret to your authenticator app: ${totpSecret}`);
