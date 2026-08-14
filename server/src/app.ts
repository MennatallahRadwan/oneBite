import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import pinoHttp from 'pino-http';
import {randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {prisma} from './db.js';
import {calculateAvailability} from './availability-service.js';
import {createReservedOrder,OrderConflictError} from './order-service.js';
import {beginOwnerLogin,completeOwnerLogin,logoutOwner,ownerFromRequest} from './owner-auth.js';

const cart=z.object({items:z.array(z.object({slug:z.string(),quantity:z.number().int().min(1)})).min(1),area:z.string().min(1)});
const order=z.object({quoteId:z.string().uuid(),selectedSlot:z.object({date:z.string(),window:z.string()}),customer:z.object({name:z.string().min(2),phone:z.string().min(6)}),address:z.object({governorate:z.string().min(1),area:z.string().min(1),block:z.string().min(1),street:z.string().min(1),building:z.string().min(1),floor:z.string().max(100).optional(),instructions:z.string().max(500).optional()})});
const quotes=new Map<string,{expiresAt:number;items:{slug:string;quantity:number}[];area:string}>();
const publicProduct={published:true,active:true,archivedAt:null};
const normalizePhone=(value:string)=>value.replace(/\D/g,'');
const ownerLogin=z.object({email:z.string().email(),password:z.string().min(12).max(200)});
const totp=z.object({code:z.string().regex(/^\d{6}$/)});

export function createApp(){
  const app=express();
  app.use(pinoHttp());
  app.use(helmet());
  app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173'}));
  app.use(express.json({limit:'100kb'}));
  app.use((_,res,next)=>{res.setHeader('X-Request-Id',randomUUID());next()});
  app.get('/api/v1/health',(_,res)=>res.json({ok:true}));
  app.post('/api/v1/owner/auth/login',rateLimit({windowMs:900000,limit:5}),async(req,res,next)=>{try{const body=ownerLogin.safeParse(req.body);if(!body.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid login details'}});const accepted=await beginOwnerLogin(body.data.email.toLowerCase(),body.data.password,res);if(!accepted)return res.status(401).json({error:{code:'INVALID_CREDENTIALS',message:'Invalid owner credentials'}});res.status(202).json({requiresTotp:true})}catch(error){next(error)}});
  app.post('/api/v1/owner/auth/verify-totp',rateLimit({windowMs:900000,limit:5}),async(req,res,next)=>{try{const body=totp.safeParse(req.body);if(!body.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid verification code'}});const owner=await completeOwnerLogin(body.data.code,req,res);if(!owner)return res.status(401).json({error:{code:'INVALID_TOTP',message:'Invalid or expired verification code'}});res.json({owner})}catch(error){next(error)}});
  app.post('/api/v1/owner/auth/logout',async(req,res,next)=>{try{await logoutOwner(req,res);res.status(204).end()}catch(error){next(error)}});
  app.get('/api/v1/owner/me',async(req,res,next)=>{try{const owner=await ownerFromRequest(req);if(!owner)return res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Owner authentication required'}});res.json({id:owner.id,name:owner.name,email:owner.email})}catch(error){next(error)}});
  app.get('/api/v1/owner/orders',async(req,res,next)=>{try{const owner=await ownerFromRequest(req);if(!owner)return res.status(401).json({error:{code:'UNAUTHENTICATED',message:'Owner authentication required'}});const items=await prisma.order.findMany({orderBy:{createdAt:'desc'},take:100,select:{publicNumber:true,status:true,fulfilmentStatus:true,codStatus:true,customerName:true,customerPhone:true,areaName:true,deliveryWindow:true,totalFils:true,createdAt:true}});res.json({items})}catch(error){next(error)}});
  app.get('/api/v1/catalog/categories',async(_req,res,next)=>{try{const categories=await prisma.category.findMany({where:{archivedAt:null,products:{some:publicProduct}},orderBy:{nameEn:'asc'},select:{slug:true,nameEn:true,nameAr:true}});res.json(categories)}catch(error){next(error)}});
  app.get('/api/v1/catalog/products',async(_req,res,next)=>{try{const items=await prisma.product.findMany({where:publicProduct,orderBy:{nameEn:'asc'},select:{slug:true,nameEn:true,nameAr:true,priceFils:true,capacityPoints:true,leadDays:true}});res.json({items})}catch(error){next(error)}});
  app.get('/api/v1/catalog/products/:slug',async(req,res,next)=>{try{const product=await prisma.product.findFirst({where:{...publicProduct,slug:req.params.slug},include:{variants:{where:{active:true}},addons:{where:{active:true}}}});if(!product)return res.status(404).json({error:{code:'NOT_FOUND',message:'Product not found'}});res.json(product)}catch(error){next(error)}});
  app.post('/api/v1/availability/earliest',async(req,res,next)=>{try{const p=cart.safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid cart'}});res.json(await calculateAvailability(p.data.items,p.data.area))}catch(error){next(error)}});
  app.post('/api/v1/checkout/quote',async(req,res,next)=>{try{const p=cart.safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid cart'}});const result=await calculateAvailability(p.data.items,p.data.area);if(result.unavailable)return res.status(409).json({error:{code:'UNAVAILABLE',message:result.reason}});const subtotal=p.data.items.reduce((total,line)=>total+(result.items.find(item=>item.slug===line.slug)?.priceFils??0)*line.quantity,0),deliveryFee=(await prisma.deliveryArea.findFirstOrThrow({where:{nameEn:p.data.area,active:true}})).feeFils,quoteId=randomUUID(),expiresAt=Date.now()+900000;quotes.set(quoteId,{expiresAt,items:p.data.items,area:p.data.area});res.json({quoteId,expiresAt:new Date(expiresAt).toISOString(),items:result.items,subtotalFils:subtotal,discountFils:0,deliveryFeeFils:deliveryFee,totalFils:subtotal+deliveryFee,capacityPoints:result.capacityPoints,earliestSlot:result.earliestSlot,availableSlots:result.availableSlots})}catch(error){next(error)}});
  app.post('/api/v1/orders',async(req,res,next)=>{try{const p=order.safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid order'}});const quote=quotes.get(p.data.quoteId);if(!quote||quote.expiresAt<Date.now())return res.status(409).json({error:{code:'STALE_QUOTE',message:'Your quote has expired. Please refresh availability.'}});const created=await createReservedOrder({items:quote.items,area:quote.area,selectedSlot:p.data.selectedSlot,customer:p.data.customer,address:p.data.address});quotes.delete(p.data.quoteId);res.status(201).json({orderNumber:created.publicNumber,trackingToken:created.trackingToken,status:created.status,message:'Awaiting bakery confirmation.'})}catch(error){if(error instanceof OrderConflictError)return res.status(409).json({error:{code:'UNAVAILABLE',message:error.message}});next(error)}});
  app.get('/api/v1/tracking/:token',async(req,res,next)=>{try{const order=await prisma.order.findUnique({where:{trackingToken:req.params.token},select:{publicNumber:true,status:true,fulfilmentStatus:true,codStatus:true,deliveryWindow:true,areaName:true,isDelayed:true,delayReason:true,createdAt:true}});if(!order)return res.status(404).json({error:{code:'NOT_FOUND',message:'Tracking record not found'}});res.json(order)}catch(error){next(error)}});
  app.post('/api/v1/tracking/lookup',rateLimit({windowMs:900000,limit:5}),async(req,res,next)=>{try{const body=z.object({orderNumber:z.string().min(1),phone:z.string().min(6)}).safeParse(req.body);if(!body.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid lookup details'}});const order=await prisma.order.findUnique({where:{publicNumber:body.data.orderNumber},select:{trackingToken:true,customerPhone:true}});if(!order||normalizePhone(order.customerPhone)!==normalizePhone(body.data.phone))return res.status(404).json({error:{code:'NOT_FOUND',message:'Tracking record not found'}});res.json({trackingToken:order.trackingToken})}catch(error){next(error)}});
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(500).json({error:{code:'INTERNAL_ERROR',message:'An unexpected error occurred'}})});
  return app;
}
