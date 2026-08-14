import {randomBytes} from 'node:crypto';
import {prisma} from './db.js';
import {calculateAvailability,type CartLine} from './availability-service.js';

type OrderRequest={items:CartLine[];area:string;selectedSlot:{date:string;window:string};customer:{name:string;phone:string};};
const day=(value:string)=>new Date(`${value}T00:00:00.000Z`);

export class OrderConflictError extends Error {}

export async function createReservedOrder(input:OrderRequest){
  const availability=await calculateAvailability(input.items,input.area);
  if(availability.unavailable||!availability.earliestSlot)throw new OrderConflictError(availability.reason??'No delivery capacity.');
  if(!availability.availableSlots.some(slot=>slot.date===input.selectedSlot.date&&slot.window===input.selectedSlot.window))throw new OrderConflictError('The selected delivery slot is no longer available.');
  const [windowStart,windowEnd]=input.selectedSlot.window.split('–');
  const date=day(input.selectedSlot.date);
  return prisma.$transaction(async tx=>{
    const area=await tx.deliveryArea.findFirst({where:{nameEn:input.area,active:true}});
    const production=await tx.productionCapacity.findUnique({where:{date}});
    const slot=area?await tx.deliverySlot.findFirst({where:{areaId:area.id,date,windowStart,windowEnd}}):null;
    if(!area||!production||!slot)throw new OrderConflictError('The selected delivery slot is no longer available.');
    const productionUpdated=await tx.productionCapacity.updateMany({where:{id:production.id,usedPoints:{lte:production.totalPoints-availability.capacityPoints}},data:{usedPoints:{increment:availability.capacityPoints}}});
    const slotUpdated=await tx.deliverySlot.updateMany({where:{id:slot.id,reserved:{lt:slot.capacity}},data:{reserved:{increment:1}}});
    if(productionUpdated.count!==1||slotUpdated.count!==1)throw new OrderConflictError('The selected delivery slot is no longer available.');
    const products=await tx.product.findMany({where:{slug:{in:input.items.map(item=>item.slug)},published:true,active:true,archivedAt:null},select:{slug:true,nameEn:true,nameAr:true,priceFils:true,capacityPoints:true}});
    const productBySlug=new Map(products.map(product=>[product.slug,product]));
    if(productBySlug.size!==new Set(input.items.map(item=>item.slug)).size)throw new OrderConflictError('Temporarily unavailable.');
    const subtotal=input.items.reduce((total,item)=>total+(productBySlug.get(item.slug)!.priceFils*item.quantity),0);
    const order=await tx.order.create({data:{publicNumber:`OB-${randomBytes(4).toString('hex').toUpperCase()}`,trackingToken:randomBytes(24).toString('base64url'),customerName:input.customer.name,customerPhone:input.customer.phone,areaName:area.nameEn,deliveryWindow:input.selectedSlot.window,subtotalFils:subtotal,deliveryFeeFils:area.feeFils,totalFils:subtotal+area.feeFils,capacityPoints:availability.capacityPoints,items:{create:input.items.map(item=>{const product=productBySlug.get(item.slug)!;return {productNameEn:product.nameEn,productNameAr:product.nameAr,selectedAddons:[],unitPriceFils:product.priceFils,quantity:item.quantity,capacityPoints:product.capacityPoints*item.quantity,allergens:[]}})},reservation:{create:{date,points:availability.capacityPoints}}},select:{publicNumber:true,trackingToken:true,status:true}});
    return order;
  },{isolationLevel:'Serializable'});
}
