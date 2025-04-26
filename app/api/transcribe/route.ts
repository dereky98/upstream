import { transcribeAudio } from '@/lib/deepgram';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: 'Deepgram API key is not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Transcribe audio
    const transcript = await transcribeAudio(buffer);

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error in transcribe API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 