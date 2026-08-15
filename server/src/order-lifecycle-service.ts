import {prisma} from './db.js';
import type {CodStatus,FulfilmentStatus,OrderStatus,Prisma} from '@prisma/client';

export class OrderLifecycleError extends Error {}

type Update={status?:OrderStatus;fulfilmentStatus?:FulfilmentStatus;codStatus?:CodStatus;rejectionReason?:string};
const terminalStatuses=new Set<OrderStatus>(['REJECTED','CANCELLED']);

async function releaseReservation(tx:Prisma.TransactionClient,order:{areaName:string;deliveryWindow:string;reservation:{id:string;date:Date;points:number;active:boolean}|null}){
  const reservation=order.reservation;
  if(!reservation?.active)return;
  const [windowStart,windowEnd]=order.deliveryWindow.split('–');
  const area=await tx.deliveryArea.findFirst({where:{nameEn:order.areaName}});
  await tx.capacityReservation.update({where:{id:reservation.id},data:{active:false}});
  await tx.productionCapacity.updateMany({where:{date:reservation.date,usedPoints:{gte:reservation.points}},data:{usedPoints:{decrement:reservation.points}}});
  if(area)await tx.deliverySlot.updateMany({where:{areaId:area.id,date:reservation.date,windowStart,windowEnd,reserved:{gt:0}},data:{reserved:{decrement:1}}});
}

export async function updateOrderLifecycle(publicNumber:string,update:Update){
  return prisma.$transaction(async tx=>{
    const order=await tx.order.findUnique({where:{publicNumber},include:{reservation:true}});
    if(!order)throw new OrderLifecycleError('Order not found.');
    if(update.status){
      if(order.status!=='PENDING_CONFIRMATION')throw new OrderLifecycleError('Only pending orders can be confirmed, rejected, or cancelled.');
      if(update.status==='REJECTED'&&!update.rejectionReason?.trim())throw new OrderLifecycleError('A rejection reason is required.');
      if(!['CONFIRMED','REJECTED','CANCELLED'].includes(update.status))throw new OrderLifecycleError('Invalid order status change.');
      if(terminalStatuses.has(update.status))await releaseReservation(tx,order);
    }
    if(update.fulfilmentStatus&&order.status!=='CONFIRMED'&&update.status!=='CONFIRMED')throw new OrderLifecycleError('Confirm the order before updating fulfilment.');
    return tx.order.update({where:{id:order.id},data:{
      ...(update.status?{status:update.status,rejectionReason:update.status==='REJECTED'?update.rejectionReason!.trim():null}:{}),
      ...(update.fulfilmentStatus?{fulfilmentStatus:update.fulfilmentStatus}:{}),
      ...(update.codStatus?{codStatus:update.codStatus}:{})
    },select:{publicNumber:true,status:true,fulfilmentStatus:true,codStatus:true,rejectionReason:true}});
  },{isolationLevel:'Serializable'});
}
