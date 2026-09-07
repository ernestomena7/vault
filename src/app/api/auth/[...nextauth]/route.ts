import { handlers } from '@/lib/auth/config';

export const { GET, POST } = handlers;

// The MySQL driver cannot run on the edge runtime.
export const runtime = 'nodejs';
