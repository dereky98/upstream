"use client";
import { connectDeepgram } from "@/lib/deepgram";
import { LiveTranscriptionEvents } from "@deepgram/sdk";
import MicRecorder from "mic-recorder-to-mp3";
import { useCallback, useEffect, useRef, useState } from "react";

// Declare a variable to hold the cleanup function
let audioCleanupFunction: (() => void) | undefined;

export default function InterviewClient() {
  /* ---------------- UI state ---------------- */
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Hi 👋  Tell me a bit about yourself." },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------- streaming refs ------------ */
  const recorder = useRef<MicRecorder | null>(null);
  const dgConnection = useRef<ReturnType<typeof connectDeepgram> | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const [isMicAllowed, setIsMicAllowed] = useState(false);

  const requestMicrophoneAccess = async () => {
    try {
      logDebug("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop this temporary stream immediately, we'll create another one for actual use
      stream.getTracks().forEach((track) => track.stop());

      logDebug("Microphone permission granted!");
      setIsMicAllowed(true);
      setError(null);

      // Now start the audio capture and deepgram connection
      initializeInterviewSession();
    } catch (err) {
      console.error("Failed to get microphone permission:", err);
      setError(`Microphone access denied: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Initialize the interview session
  const initializeInterviewSession = useCallback(() => {
    if (!isMicAllowed) {
      logDebug("Cannot start interview without microphone permission");
      return;
    }

    let cleanup: (() => void) | undefined;

    try {
      // Initialize MicRecorder
      if (typeof window !== "undefined") {
        try {
          recorder.current = new MicRecorder({
            bitRate: 128,
          });
          logDebug("MicRecorder initialized successfully");
        } catch (err) {
          console.error("Failed to initialize MicRecorder:", err);
          setError(
            `Failed to initialize audio recorder: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          return;
        }
      }

      // Initialize Deepgram connection
      logDebug("Creating Deepgram connection...");
      dgConnection.current = connectDeepgram();
      logDebug("Deepgram connection object created and stored in ref");

      // Add event listeners
      setupDeepgramEventListeners();

      // Setup audio capture - now happens in the Open event handler
    } catch (err) {
      console.error("Error in setup:", err);
      setError(`Setup error: ${err instanceof Error ? err.message : String(err)}`);

      // Clean up on error
      if (cleanup) {
        cleanup();
      }
    }
  }, [isMicAllowed]);

  // Setup Deepgram event listeners in a separate function for clarity
  const setupDeepgramEventListeners = () => {
    if (!dgConnection.current) {
      logDebug("❌ ERROR: No Deepgram connection available for event setup");
      return;
    }

    logDebug("Setting up Deepgram event listeners");

    // Setup Deepgram event handlers
    dgConnection.current.addListener(LiveTranscriptionEvents.Open, () => {
      logDebug("💬 Deepgram connection opened successfully");
      setIsConnected(true);
      setError(null);

      // Once connection is open, start audio capture
      logDebug("Connection open - setting up audio capture");
      setupAudioCapture().then((cleanupFn) => {
        // Store cleanup function for later use
        if (typeof cleanupFn === "function") {
          // Store in a module-level variable that persists
          audioCleanupFunction = cleanupFn;
          logDebug("Audio cleanup function stored");
        }
      });
    });

    dgConnection.current.addListener(LiveTranscriptionEvents.Error, (err) => {
      logDebug("❌ Deepgram error:", err);
      setError(`Deepgram error: ${err.message || JSON.stringify(err)}`);
    });

    dgConnection.current.addListener(LiveTranscriptionEvents.Close, () => {
      logDebug("🛑 Deepgram connection closed");
      setIsConnected(false);

      // Clean up audio resources when connection closes
      if (audioCleanupFunction) {
        logDebug("Running audio cleanup");
        audioCleanupFunction();
        audioCleanupFunction = undefined;
      }
    });

    // Handle transcription results
    dgConnection.current.addListener(LiveTranscriptionEvents.Transcript, (result) => {
      if (
        !result ||
        !result.channel ||
        !result.channel.alternatives ||
        !result.channel.alternatives[0]
      ) {
        logDebug("⚠️ Received incomplete transcript result");
        return;
      }

      const transcript = result.channel.alternatives[0].transcript || "";
      if (!transcript.trim()) {
        logDebug("Received empty transcript, ignoring");
        return;
      }

      logDebug(`📝 Transcript received: "${transcript}", Final: ${result.is_final}`);

      // Show interim transcript
      if (!result.is_final) {
        setMsgs((m) => {
          // Replace the last message if it's from the user
          if (m.length > 0 && m[m.length - 1].role === "user") {
            return [...m.slice(0, -1), { role: "user", text: transcript }];
          }
          // Otherwise add a new user message
          return [...m, { role: "user", text: transcript }];
        });
        return;
      }

      // Final transcript -> fire AI response
      handleUtterance(transcript);
    });

    logDebug("All Deepgram event listeners set up");
  };

  useEffect(() => {
    console.log("Initializing interview client...");
    // We'll wait for explicit user permission before starting

    return () => {
      console.log("Cleanup: Closing Deepgram connection");

      // Clean up the media stream
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach((track) => track.stop());
        mediaStream.current = null;
      }

      // Close Deepgram connection
      if (dgConnection.current) {
        // Try to close the connection using the appropriate method
        try {
          if (typeof dgConnection.current.requestClose === "function") {
            dgConnection.current.requestClose();
          }
        } catch (err) {
          console.error("Error closing Deepgram connection:", err);
        }
      }
    };
  }, []);

  // Setup audio capture directly using navigator.mediaDevices
  const setupAudioCapture = async () => {
    try {
      logDebug("Setting up audio capture...");

      // Request microphone access directly
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Match Deepgram's expected sample rate
        },
      });

      if (!mediaStream.current) {
        throw new Error("Failed to get media stream");
      }

      logDebug("Media stream obtained successfully");
      const audioTracks = mediaStream.current.getAudioTracks();
      logDebug(
        `Got ${audioTracks.length} audio tracks`,
        audioTracks.map((track) => `${track.label} (${track.enabled ? "enabled" : "disabled"})`)
      );

      // Create an AudioContext to analyze audio levels
      const audioContext = new AudioContext({ sampleRate: 16000 }); // Match Deepgram's expected sample rate
      const source = audioContext.createMediaStreamSource(mediaStream.current);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      // Set up a periodic level check
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const checkAudioLevel = () => {
        analyzer.getByteFrequencyData(dataArray);
        // Calculate average level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        logDebug(`Current audio level: ${average.toFixed(2)}`);

        // Show status update if sound is detected
        if (average > 10) {
          logDebug(`Sound detected! Level: ${average.toFixed(2)}`);
        }
      };

      // Check audio level every second
      const levelCheckInterval = setInterval(checkAudioLevel, 1000);

      // Create a MediaRecorder with linear PCM instead of webm
      // First, setup a processor to convert the audio
      const processorNode = audioContext.createScriptProcessor(1024, 1, 1);

      // Configure for linear PCM (16-bit)
      const pcmData = new Int16Array(1024);

      // Process audio data
      processorNode.onaudioprocess = (e) => {
        if (!dgConnection.current) return;

        // Get audio samples
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
        for (let i = 0; i < inputData.length; i++) {
          // Scale and clamp
          const s = Math.max(-1, Math.min(1, inputData[i]));
          // Convert to 16-bit PCM
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send to Deepgram
        try {
          const buffer = pcmData.buffer.slice(0);
          if (buffer.byteLength > 0 && dgConnection.current) {
            logDebug(`Sending ${buffer.byteLength} bytes of PCM audio to Deepgram`);
            dgConnection.current.send(buffer);
          }
        } catch (sendErr) {
          console.error("Error sending audio data:", sendErr);
        }
      };

      // Connect the processor
      source.connect(processorNode);
      processorNode.connect(audioContext.destination);

      logDebug("Audio processing pipeline established");

      // Return cleanup function
      return () => {
        clearInterval(levelCheckInterval);
        processorNode.disconnect();
        source.disconnect();
        audioContext.close();
        logDebug("Audio processing resources cleaned up");
      };
    } catch (err: unknown) {
      console.error("Error setting up audio capture:", err);
      setError(`Audio capture error: ${err instanceof Error ? err.message : String(err)}`);
      return () => {}; // Return an empty cleanup function on error
    }
  };

  // Play a test sound to verify audio is working
  const playTestSound = () => {
    try {
      console.log("Playing test sound...");
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5); // Play for 0.5 seconds
    } catch (err) {
      console.error("Failed to play test sound:", err);
      setError(`Audio playback error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Manually trigger the initial AI greeting
  const triggerAIGreeting = async () => {
    try {
      setError(null);
      console.log("Manually triggering AI greeting...");

      const initialMessage =
        "Hello! Welcome to this AI interview. I'm excited to chat with you today. Could you please introduce yourself?";
      setMsgs([{ role: "assistant", text: initialMessage }]);

      console.log("About to play greeting:", initialMessage);
      await speakText(initialMessage);
    } catch (err) {
      console.error("Error in AI greeting:", err);
      setError(`Failed to play greeting: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Speak text using server-side API
  const speakText = async (text: string) => {
    try {
      console.log("Generating speech for:", text);

      // Call server-side TTS API
      console.log("Calling server-side TTS API...");
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `TTS API error: ${response.status} - ${errorData.error || "Unknown error"}`
        );
      }

      // Get audio data as blob
      const audioBlob = await response.blob();
      console.log("Received audio blob from server, size:", audioBlob.size);

      // Create audio element and play
      const audioUrl = URL.createObjectURL(audioBlob);
      const audioElement = new Audio(audioUrl);

      // Set up event handlers
      audioElement.onerror = (e) => {
        console.error("Audio playback error:", e);
        throw new Error("Audio playback failed");
      };

      // Play the audio
      console.log("Starting audio playback");
      audioElement.play();

      // Wait for playback to complete
      return new Promise<void>((resolve, reject) => {
        audioElement.onended = () => {
          console.log("Audio playback complete");
          URL.revokeObjectURL(audioUrl); // Clean up
          resolve();
        };

        audioElement.onerror = (error) => {
          console.error("Error during audio playback:", error);
          URL.revokeObjectURL(audioUrl); // Clean up
          reject(new Error("Audio playback failed"));
        };
      });
    } catch (err) {
      console.error("Error in speech playback:", err);
      throw err;
    }
  };

  /* ---------- LLM + Cartesia breath --------- */
  async function handleUtterance(userText: string) {
    console.log("Processing user utterance:", userText);

    try {
      // Create a history with the latest user message
      const historyMessages = [
        ...msgs.filter((m) => m.role === "assistant"),
        { role: "user" as const, text: userText },
      ];
      setMsgs(historyMessages);

      // 1️⃣ get assistant reply
      console.log("Fetching assistant response...");
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: historyMessages }),
      });

      if (!chatRes.ok) {
        throw new Error(`Chat API error: ${chatRes.status}`);
      }

      const data = await chatRes.json();
      const assistantResponse = data.assistant || "I'm not sure how to respond to that.";
      console.log("Assistant response:", assistantResponse);

      // Update the UI with the assistant's response
      setMsgs((prev) => [...prev, { role: "assistant", text: assistantResponse }]);

      // 2️⃣ speak the response
      console.log("Speaking assistant response...");
      await speakText(assistantResponse);
    } catch (err) {
      console.error("Error handling utterance:", err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Test sending audio to Deepgram
  const testDeepgramConnection = () => {
    try {
      logDebug("🧪 TESTING DEEPGRAM CONNECTION");

      if (!dgConnection.current) {
        logDebug("❌ No Deepgram connection available");
        setError("No Deepgram connection available. Try allowing the microphone first.");

        // Attempt to reconnect
        logDebug("Attempting to re-initialize Deepgram...");
        initializeInterviewSession();

        // Check if initialization worked
        setTimeout(() => {
          if (dgConnection.current) {
            logDebug("✅ Deepgram connection re-established");
          } else {
            logDebug("❌ Failed to re-establish Deepgram connection");
          }
        }, 1000);

        return;
      }

      logDebug("✅ Deepgram connection object exists");
      logDebug("Connected status: " + (isConnected ? "connected" : "not connected"));

      // Check connection state if not connected
      if (!isConnected) {
        logDebug("⚠️ Connection exists but not in connected state");
        logDebug("Waiting for connection to open...");

        // Adding another listener just in case
        dgConnection.current.addListener(LiveTranscriptionEvents.Open, () => {
          logDebug("Connection just opened during test!");
        });

        // Continue anyway to test if audio can still be sent
      }

      // Create a test audio buffer with a simple sine wave
      const sampleRate = 48000;
      const duration = 1; // 1 second
      const frequency = 440; // A4 note

      // Create the audio context and buffer
      const audioCtx = new AudioContext({ sampleRate });
      const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const channelData = buffer.getChannelData(0);

      // Fill the buffer with a sine wave
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
      }

      logDebug(`📢 Generated ${channelData.length} samples of test audio`);

      // Convert to WAV format
      const encoder = new window.AudioContext();
      const testNode = encoder.createBufferSource();
      testNode.buffer = buffer;

      // Create a media stream from the buffer
      const dest = encoder.createMediaStreamDestination();
      testNode.connect(dest);
      testNode.start();

      // Create a media recorder to get the data
      const recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (event) => {
        logDebug(`🎙️ Got ${event.data.size} bytes of test audio`);

        if (event.data.size > 0 && dgConnection.current) {
          event.data.arrayBuffer().then((buffer) => {
            logDebug(`📤 Sending ${buffer.byteLength} bytes to Deepgram`);
            dgConnection.current!.send(buffer);
            logDebug("✅ Test audio sent to Deepgram");
          });
        }
      };

      // Start recording and get data immediately
      recorder.start();
      setTimeout(() => {
        recorder.stop();
      }, 500);
    } catch (err) {
      console.error("❌ Error testing Deepgram:", err);
      setError(`Test error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Helper for more visible console logs
  const logDebug = (message: string, data?: unknown) => {
    const formattedMsg = `🔍 ${message}`;
    if (data) {
      console.log(formattedMsg, data);
    } else {
      console.log(formattedMsg);
    }

    // Also output to a div if it exists - more reliable than console in some cases
    const debugOutput = document.getElementById("debug-output");
    if (debugOutput) {
      const logLine = document.createElement("div");
      logLine.textContent = `${new Date().toISOString().substring(11, 19)} - ${message}`;
      debugOutput.prepend(logLine);

      // Limit to last 10 messages
      while (debugOutput.childNodes.length > 10) {
        debugOutput.removeChild(debugOutput.lastChild as Node);
      }
    }
  };

  return (
    <main className="p-6 space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold">Error</h2>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h1 className="text-xl font-bold mb-2">Voice Interview</h1>
        <p className="text-sm">
          Status:{" "}
          {isConnected ? (
            <span className="text-green-600">Connected and listening</span>
          ) : (
            <span className="text-red-600">Not connected</span>
          )}
        </p>

        {/* Debug buttons */}
        <div className="flex gap-2 mt-4">
          {!isMicAllowed ? (
            <button
              onClick={requestMicrophoneAccess}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
            >
              Allow Microphone
            </button>
          ) : (
            <>
              <button
                onClick={playTestSound}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                Test Sound
              </button>
              <button
                onClick={triggerAIGreeting}
                className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
              >
                Start Interview
              </button>
              <button
                onClick={testDeepgramConnection}
                className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600"
              >
                Test Deepgram
              </button>
            </>
          )}
        </div>

        {/* Debug info section */}
        <div className="mt-4 text-xs bg-gray-200 p-2 rounded">
          <p>
            <strong>Debug Info:</strong>
          </p>
          <p>Mic Permission: {isMicAllowed ? "✅ Granted" : "❌ Not granted"}</p>
          <p>Deepgram Connection: {isConnected ? "✅ Connected" : "❌ Not connected"}</p>
          <p>Audio Tracks: {mediaStream.current?.getAudioTracks().length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">
            Check your browser console (F12) for detailed logs
          </p>

          {/* Live debug output */}
          <div
            id="debug-output"
            className="mt-2 max-h-28 overflow-y-auto bg-gray-700 text-green-300 p-2 font-mono text-xs"
          >
            <div>Waiting for events...</div>
          </div>
        </div>
      </div>

      <ul className="space-y-2 text-sm bg-white p-4 rounded-lg shadow max-h-80 overflow-y-auto">
        {msgs.map((m, i) => (
          <li
            key={i}
            className={`p-2 rounded-lg ${
              m.role === "assistant" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
            }`}
          >
            <span className="font-bold">{m.role === "assistant" ? "AI: " : "You: "}</span>
            {m.text}
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-500 mt-2">
        Listening... speak naturally, then pause to let the AI answer.
      </p>
    </main>
  );
}
