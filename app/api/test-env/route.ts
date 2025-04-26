import { NextResponse } from 'next/server';

export async function GET() {
  // Don't expose full API keys in production
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    DEEPGRAM_API_KEY_EXISTS: !!process.env.DEEPGRAM_API_KEY,
    CARTESIA_API_KEY_EXISTS: !!process.env.CARTESIA_API_KEY,
    ENV_VARS: Object.keys(process.env).filter(k => !k.includes('SECRET')).join(', '),
  };
  
  if (process.env.CARTESIA_API_KEY) {
    envInfo['CARTESIA_API_KEY_PREFIX'] = process.env.CARTESIA_API_KEY.substring(0, 12);
    envInfo['CARTESIA_API_KEY_LENGTH'] = process.env.CARTESIA_API_KEY.length;
  }
  
  if (process.env.DEEPGRAM_API_KEY) {
    envInfo['DEEPGRAM_API_KEY_PREFIX'] = process.env.DEEPGRAM_API_KEY.substring(0, 5);
    envInfo['DEEPGRAM_API_KEY_LENGTH'] = process.env.DEEPGRAM_API_KEY.length;
  }
  
  return NextResponse.json(envInfo);
} 