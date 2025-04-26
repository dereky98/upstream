import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

// Modern format for using Deepgram SDK v3+
export function connectDeepgram() {
  console.log("====== DEEPGRAM INITIALIZATION STARTED ======");
  
  // Get the API key from environment variables
  let apiKey = process.env.DEEPGRAM_API_KEY || '';
  
  // Clean up any trailing special characters or whitespace
  apiKey = apiKey.trim().replace(/[%\r\n]+$/, '');
  console.log("Deepgram API Key available:", !!apiKey);
  
  if (!apiKey) {
    console.error("Deepgram API key not found in environment variables");
    throw new Error("A Deepgram API key is required. Please set DEEPGRAM_API_KEY in your .env.local file");
  }
  
  try {
    console.log("Initializing Deepgram client");
    const deepgram = createClient(apiKey);
    
    // Use simpler settings to avoid WebSocket issues
    console.log("Creating live transcription connection with simplified settings");
    const options = {
      model: "nova-2",
      punctuate: true,
      interim_results: true,
      language: "en",
      encoding: "linear16", // Try more common format
      sample_rate: 16000,   // Standard sample rate
      channels: 1
    };
    console.log(JSON.stringify(options, null, 2));
    
    console.log("Calling deepgram.listen.live()...");
    const connection = deepgram.listen.live(options);
    console.log("Deepgram live connection created");
    
    // Add event handlers
    console.log("Setting up Deepgram event handlers");
    
    connection.addListener(LiveTranscriptionEvents.Open, () => {
      console.log("💬 DEEPGRAM CONNECTION OPEN 💬");
    });
    
    connection.addListener(LiveTranscriptionEvents.Error, (error) => {
      console.error("❌ DEEPGRAM ERROR:", error);
      
      // Check if it's a WebSocket error
      if (error instanceof Event && error.type === 'error' && error.target instanceof WebSocket) {
        console.error("WebSocket connection error - check network connectivity or firewall settings");
        console.error("WebSocket URL:", error.target.url);
        console.error("WebSocket state:", error.target.readyState);
      }
    });
    
    connection.addListener(LiveTranscriptionEvents.Close, () => {
      console.log("🛑 DEEPGRAM CONNECTION CLOSED");
    });
    
    connection.addListener(LiveTranscriptionEvents.Metadata, (metadata) => {
      console.log("ℹ️ Deepgram metadata:", metadata);
    });
    
    connection.addListener(LiveTranscriptionEvents.UtteranceEnd, () => {
      console.log("🗣️ Deepgram utterance ended");
    });
    
    // Critical event - Add extra logging
    connection.addListener(LiveTranscriptionEvents.Transcript, (result) => {
      console.log("📝 DEEPGRAM TRANSCRIPT RECEIVED");
      
      // Add additional checks for the transcript result
      if (!result) {
        console.warn("⚠️ Empty transcript result");
        return;
      }
      
      if (!result.channel) {
        console.warn("⚠️ No channel in transcript result");
        return;
      }
      
      if (!result.channel.alternatives || !result.channel.alternatives[0]) {
        console.warn("⚠️ No alternatives in transcript channel");
        return;
      }
      
      const transcript = result.channel.alternatives[0].transcript || '';
      console.log(`🔤 TRANSCRIPT TEXT: "${transcript}" (Final: ${result.is_final})`);
    });
    
    console.log("====== DEEPGRAM INITIALIZATION COMPLETE ======");
    return connection;
  } catch (error) {
    console.error("❌❌❌ FATAL ERROR initializing Deepgram:", error);
    throw error;
  }
}
