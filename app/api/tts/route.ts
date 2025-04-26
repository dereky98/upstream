import { CartesiaClient } from '@cartesia/cartesia-js';
import { NextRequest, NextResponse } from 'next/server';

// Get an API key with validation
function getCleanApiKey() {
  const apiKey = process.env.CARTESIA_API_KEY || '';
  
  // Log key characteristics without exposing the full key
  console.log('CARTESIA_API_KEY available:', !!apiKey);
  console.log('CARTESIA_API_KEY length:', apiKey.length);
  
  if (apiKey) {
    console.log('Key prefix:', apiKey.substring(0, 8));
    console.log('Key format valid:', apiKey.startsWith('cartesia_') || apiKey.startsWith('KEY'));
  }
  
  return apiKey.trim();
}

// Hard coded key for debugging - REMOVE IN PRODUCTION
const HARDCODED_KEY = 'KEY19023qjJKD92_uCeEkXw.6wEZkP97SZKuXv9dRpYL2lWjKy4XNOzAmmR5T9Ue58w';

// Server-side Cartesia client (where API key is secured)
const cartesia = new CartesiaClient({
  apiKey: getCleanApiKey() || HARDCODED_KEY,
  cartesiaVersion: "2024-06-10",
});

// Voice IDs for easy reference
export const CARTESIA_VOICES = {
  // Male voices
  ETHAN: "00967b2f-88a6-4a31-8153-110a92134b9f",  // Default male
  THOMAS: "3e6c517e-c795-4cd3-99e7-3a20cb30a7ea",  // Professional male
  ALEX: "34658ac1-0469-4ceb-a1c5-b6e7fae0f941",    // Casual male
  // Female voices
  EMMA: "9f5c5c1c-98af-4e4a-abc9-129c461a96e8",    // Professional female
  SOPHIE: "91aa42ba-23f9-4b28-a3c8-77bbeaff30ba",   // Casual female
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = getCleanApiKey();
    
    if (!apiKey && !HARDCODED_KEY) {
      console.error('Cartesia API key not set in environment variables');
      return NextResponse.json(
        { error: 'Cartesia API key is not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { text, voiceId } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      );
    }
    
    console.log('TTS request received, generating audio for:', text.substring(0, 30) + '...');
    console.log('Using voice ID:', voiceId || 'default');
    
    try {
      // Generate audio with Cartesia
      const response = await cartesia.tts.bytes({
        modelId: "sonic-2",
        transcript: text,
        voice: { 
          mode: "id", 
          id: voiceId || "00967b2f-88a6-4a31-8153-110a92134b9f" // Default voice if not specified
        },
        outputFormat: {
          container: "wav",
          encoding: "pcm_s16le",
          sampleRate: 24000
        }
      });
      
      console.log('TTS generation successful, returning audio data');
      
      // Return audio as binary response
      return new NextResponse(response, {
        headers: {
          'Content-Type': 'audio/wav',
        },
      });
    } catch (ttsError) {
      console.error('Error from Cartesia TTS API:', ttsError);
      
      // Try with fallback settings
      try {
        console.log('Attempting with fallback settings');
        const fallbackResponse = await cartesia.tts.bytes({
          modelId: "sonic-2",
          transcript: text,
          voice: { mode: "id", id: voiceId || "00967b2f-88a6-4a31-8153-110a92134b9f" },
          outputFormat: {
            container: "mp3",
            bitRate: 128000,
            sampleRate: 24000
          }
        });
        
        console.log('Fallback TTS generation successful');
        return new NextResponse(fallbackResponse, {
          headers: {
            'Content-Type': 'audio/mp3',
          },
        });
      } catch (fallbackError) {
        console.error('Fallback TTS attempt also failed:', fallbackError);
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error('Server TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate speech: ${errorMessage}` },
      { status: 500 }
    );
  }
} 