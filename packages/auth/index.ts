import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  twoFactorCode: z.string().optional(),
});

export const twoFactorSchema = z.object({
  token: z.string().length(6),
});

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// TOTP utilities
export const generateTOTPSecret = () => {
  return speakeasy.generateSecret({
    name: 'Traffboard Analytics',
    length: 32,
  });
};

export const generateQRCode = async (secret: string, email: string): Promise<string> => {
  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret,
    label: email,
    issuer: 'Traffboard',
  });
  
  return QRCode.toDataURL(otpauthUrl);
};

export const verifyTOTP = (token: string, secret: string): boolean => {
  return speakeasy.totp.verify({
    secret: secret,
    token: token,
    window: 2,
  });
};

// JWT utilities
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const JWT_EXPIRES_IN = '15m';
// Refresh tokens don't use JWT expiry - they're stored in database

export const generateAccessToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const generateRefreshToken = (): string => {
  return randomBytes(32).toString('hex');
};

export const verifyAccessToken = (token: string): { userId: number } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
};

export type LoginCredentials = z.infer<typeof loginSchema>;
export type RegisterCredentials = z.infer<typeof registerSchema>;
export type TwoFactorToken = z.infer<typeof twoFactorSchema>;
