import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import pinoHttp from 'pino-http';
import {randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {availability,catalog,reservations} from './domain.js';
import {prisma} from './db.js';
import {calculateAvailability} from './availability-service.js';

const cart=z.object({items:z.array(z.object({slug:z.string(),quantity:z.number().int().min(1)})).min(1),area:z.string().min(1)});
const order=cart.extend({selectedSlot:z.object({date:z.string(),window:z.string()}),customer:z.object({name:z.string().min(2),phone:z.string().min(6)}),address:z.object({governorate:z.string(),area:z.string(),block:z.string(),street:z.string(),building:z.string()})});
const quotes=new Map<string,{expiresAt:number}>();
const publicProduct={published:true,active:true,archivedAt:null};

export function createApp(){
  const app=express();
  app.use(pinoHttp());
  app.use(helmet());
  app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173'}));
  app.use(express.json({limit:'100kb'}));
  app.use((_,res,next)=>{res.setHeader('X-Request-Id',randomUUID());next()});
  app.get('/api/v1/health',(_,res)=>res.json({ok:true}));
  app.get('/api/v1/catalog/categories',async(_req,res,next)=>{try{const categories=await prisma.category.findMany({where:{archivedAt:null,products:{some:publicProduct}},orderBy:{nameEn:'asc'},select:{slug:true,nameEn:true,nameAr:true}});res.json(categories)}catch(error){next(error)}});
  app.get('/api/v1/catalog/products',async(_req,res,next)=>{try{const items=await prisma.product.findMany({where:publicProduct,orderBy:{nameEn:'asc'},select:{slug:true,nameEn:true,nameAr:true,priceFils:true,capacityPoints:true,leadDays:true}});res.json({items})}catch(error){next(error)}});
  app.get('/api/v1/catalog/products/:slug',async(req,res,next)=>{try{const product=await prisma.product.findFirst({where:{...publicProduct,slug:req.params.slug},include:{variants:{where:{active:true}},addons:{where:{active:true}}}});if(!product)return res.status(404).json({error:{code:'NOT_FOUND',message:'Product not found'}});res.json(product)}catch(error){next(error)}});
  app.post('/api/v1/availability/earliest',async(req,res,next)=>{try{const p=cart.safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid cart'}});res.json(await calculateAvailability(p.data.items,p.data.area))}catch(error){next(error)}});
  app.post('/api/v1/checkout/quote',async(req,res,next)=>{try{const p=cart.safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid cart'}});const result=await calculateAvailability(p.data.items,p.data.area);if(result.unavailable)return res.status(409).json({error:{code:'UNAVAILABLE',message:result.reason}});const subtotal=p.data.items.reduce((total,line)=>total+(result.items.find(item=>item.slug===line.slug)?.priceFils??0)*line.quantity,0),deliveryFee=(await prisma.deliveryArea.findFirstOrThrow({where:{nameEn:p.data.area,active:true}})).feeFils,quoteId=randomUUID();quotes.set(quoteId,{expiresAt:Date.now()+900000});res.json({quoteId,expiresAt:new Date(Date.now()+900000).toISOString(),items:result.items,subtotalFils:subtotal,discountFils:0,deliveryFeeFils:deliveryFee,totalFils:subtotal+deliveryFee,capacityPoints:result.capacityPoints,earliestSlot:result.earliestSlot,availableSlots:result.availableSlots})}catch(error){next(error)}});
  app.post('/api/v1/orders',(req,res)=>{const p=order.safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Invalid order'}});const result=availability(p.data.items,p.data.area);if(result.unavailable||!result.earliestSlot)return res.status(409).json({error:{code:'UNAVAILABLE',message:result.unavailable?result.reason:'No delivery capacity'}});reservations.push({date:p.data.selectedSlot.date,points:result.capacityPoints!,status:'PENDING_CONFIRMATION'});return res.status(201).json({orderNumber:`OB-${randomBytes(4).toString('hex').toUpperCase()}`,trackingToken:randomBytes(24).toString('base64url'),status:'PENDING_CONFIRMATION',message:'Awaiting bakery confirmation.'})});
  app.get('/api/v1/tracking/:token',(_,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Tracking record not found'}}));
  app.post('/api/v1/tracking/lookup',rateLimit({windowMs:900000,limit:5}),(_,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Tracking record not found'}}));
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(500).json({error:{code:'INTERNAL_ERROR',message:'An unexpected error occurred'}})});
  return app;
}
