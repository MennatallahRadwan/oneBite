import type {Response} from 'express';
import {rateLimit} from 'express-rate-limit';

export function validationError(res: Response, message: string) {
  return res.status(400).json({error: {code: 'VALIDATION_ERROR', message}});
}

export function unauthenticated(res: Response) {
  return res.status(401).json({error: {code: 'UNAUTHENTICATED', message: 'Owner authentication required'}});
}

export const authLimiter = () => rateLimit({windowMs: 900000, limit: 5});
