export type CartLine={slug:string;quantity:number};
export type Slot={date:string;window:string};
export type Quote={quoteId:string;expiresAt:string;subtotalFils:number;discountFils:number;deliveryFeeFils:number;totalFils:number;capacityPoints:number;earliestSlot:Slot|null;availableSlots:Slot[]};
export type CreateOrder={quoteId:string;selectedSlot:Slot;customer:{name:string;phone:string};address:{governorate:string;area:string;block:string;street:string;building:string;floor?:string;instructions?:string}};
export type CreatedOrder={orderNumber:string;trackingToken:string;status:string;message:string};
export type TrackingOrder={publicNumber:string;status:'PENDING_CONFIRMATION'|'CONFIRMED'|'REJECTED'|'CANCELLED';fulfilmentStatus:'NOT_STARTED'|'PREPARING'|'READY'|'OUT_FOR_DELIVERY'|'DELIVERED'|'DELIVERY_ISSUE';codStatus:string;deliveryWindow:string;areaName:string;isDelayed:boolean;delayReason:string|null;createdAt:string};

const base=import.meta.env.VITE_API_URL||'/api/v1';
async function request<T>(path:string,init?:RequestInit){
  const response=await fetch(`${base}${path}`,{headers:{'Content-Type':'application/json',...(init?.headers||{})},...init});
  if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.error?.message||'Request failed')}
  return response.json() as Promise<T>;
}

export const api={
  catalog:()=>request<{items:unknown[]}>('/catalog/products'),
  availability:(items:CartLine[],area:string)=>request<{capacityPoints:number;earliestSlot:Slot|null;availableSlots:Slot[]}>('/availability/earliest',{method:'POST',body:JSON.stringify({items,area})}),
  quote:(items:CartLine[],area:string)=>request<Quote>('/checkout/quote',{method:'POST',body:JSON.stringify({items,area})}),
  createOrder:(order:CreateOrder)=>request<CreatedOrder>('/orders',{method:'POST',body:JSON.stringify(order)}),
  tracking:(token:string)=>request<TrackingOrder>(`/tracking/${encodeURIComponent(token)}`)
};
