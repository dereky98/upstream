# Voice AI Interview

A Next.js application that creates a voice-based AI interview experience using:

- [Cartesia Sonic-2](https://cartesia.ai) for high-quality text-to-speech
- [Anthropic Claude 3.7](https://anthropic.com) for conversational reasoning
- [Deepgram](https://deepgram.com) for speech-to-text
- [Next.js App Router](https://nextjs.org) for the frontend

## Features

- Real-time voice conversations with an AI interviewer
- High-quality text-to-speech using Cartesia Sonic-2
- Accurate speech recognition with Deepgram
- Intelligent conversation flow powered by Claude 3.7

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd voice-ai-interview
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env.local` file with your API keys

```
DEEPGRAM_API_KEY=your_deepgram_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
CARTESIA_API_KEY=your_cartesia_api_key
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start the voice interview.

## Project Structure

- `/app` - Next.js App Router pages and API routes
- `/lib` - Utility functions for Cartesia TTS, Deepgram STT, and Claude LLM
- `/public` - Static assets

## API Routes

- `/api/transcribe` - Converts audio to text using Deepgram
- `/api/chat` - Gets responses from Claude 3.7
- `/api/tts` - Generates speech from text using Cartesia Sonic-2

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
