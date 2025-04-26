import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Only provide the API key if it exists
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: 'Deepgram API key is not configured' },
        { status: 500 }
      );
    }

    // Return the API key
    return NextResponse.json({ 
      apiKey: process.env.DEEPGRAM_API_KEY 
    });
  } catch (error) {
    console.error('Error in Deepgram API key route:', error);
    return NextResponse.json(
      { error: 'Failed to provide Deepgram API key' },
      { status: 500 }
    );
  }
} 