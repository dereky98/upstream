import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@deepgram/sdk', '@anthropic-ai/sdk', '@cartesia/cartesia-js'],
  },
  env: {
    // Make sure these variables are explicitly available to both client and server
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
    CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
  },
};

export default nextConfig;
