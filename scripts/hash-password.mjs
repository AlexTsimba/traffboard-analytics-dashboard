#!/usr/bin/env node

import { createHash } from 'crypto';

// Create proper password hash for admin123456
const password = 'admin123456';
const salt = '7f9a6c5b8e3d2a1f';
const hash = createHash('sha256').update(salt + password).digest('hex');

console.log(`Salt: ${salt}`);
console.log(`Hash: ${salt}:${hash}`);
