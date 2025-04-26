import MicRecorder from 'mic-recorder-to-mp3';

let recorder: MicRecorder | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let javascriptNode: ScriptProcessorNode | null = null;
let continuousListeningActive = false;

/**
 * Initialize microphone recorder
 */
export function initRecorder() {
  if (typeof window !== 'undefined') {
    recorder = new MicRecorder({ bitRate: 128 });
  }
  return recorder;
}

/**
 * Start recording audio from microphone
 * @returns Promise that resolves when recording starts
 */
export async function startRecording() {
  if (!recorder) {
    throw new Error('Recorder not initialized');
  }
  
  return recorder.start();
}

/**
 * Stop recording and get audio data
 * @returns Promise with audio data
 */
export async function stopRecording(): Promise<{ buffer: Buffer; blob: Blob }> {
  if (!recorder) {
    throw new Error('Recorder not initialized');
  }
  
  const [buffer, blob] = await recorder.stop().getMp3();
  return { buffer, blob };
}

/**
 * Play audio from an async iterable of Uint8Array chunks
 * @param audioChunks Async iterable of audio chunks
 */
export async function playAudioStream(audioChunks: AsyncIterable<Uint8Array>) {
  if (typeof window === 'undefined') return;

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  for await (const chunk of audioChunks) {
    const audioBuffer = await audioContext.decodeAudioData(chunk.buffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  }
}

/**
 * Initialize continuous listening mode with automatic speech detection
 * @param onSpeechStart Callback when speech is detected
 * @param onSpeechEnd Callback when speech ends with the recorded audio blob
 * @param onSilence Callback when silence is detected
 * @param silenceThreshold Volume level considered silence (0-100, default 15)
 * @param silenceDuration How long silence must persist to trigger end (ms, default 800)
 */
export function initContinuousListening(
  onSpeechStart: () => void,
  onSpeechEnd: (blob: Blob) => void,
  onSilence?: () => void,
  silenceThreshold = 15,
  silenceDuration = 800
) {
  if (typeof window === 'undefined') return false;
  
  try {
    console.log("Initializing continuous listening mode");
    
    // Initialize audio context and analyzer
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    
    // We need to create a script processor for analyzing the audio
    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    
    // Connect the nodes
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
    
    let isSpeaking = false;
    let silenceStartTime = Date.now();
    let speechStartTime = Date.now();
    let currentRecorder: MicRecorder | null = null;
    
    // Safety timer to ensure recording stops even if silence detection fails
    let safetyTimer: number | null = null;
    const MAX_RECORDING_TIME = 15000; // 15 seconds max recording
    
    // Create a function to force stop recording
    const forceStopRecording = () => {
      if (currentRecorder && isSpeaking) {
        console.log("Forcing recording to stop after max time");
        isSpeaking = false;
        
        try {
          currentRecorder.stop().getMp3().then(([_buffer, blob]) => {
            onSpeechEnd(blob);
          }).catch(err => {
            console.error("Error stopping recording:", err);
            // Create an empty audio blob as fallback
            const emptyBlob = new Blob([], { type: 'audio/mp3' });
            onSpeechEnd(emptyBlob);
          });
        } catch (error) {
          console.error("Error in force stop:", error);
          const emptyBlob = new Blob([], { type: 'audio/mp3' });
          onSpeechEnd(emptyBlob);
        }
        
        if (onSilence) {
          onSilence();
        }
      }
    };
    
    // Request microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        microphone = audioContext!.createMediaStreamSource(stream);
        microphone.connect(analyser!);
        
        continuousListeningActive = true;
        console.log("Continuous listening activated");
        
        // Process audio data
        javascriptNode!.onaudioprocess = function() {
          const array = new Uint8Array(analyser!.frequencyBinCount);
          analyser!.getByteFrequencyData(array);
          
          // Calculate average volume level
          let values = 0;
          const length = array.length;
          for (let i = 0; i < length; i++) {
            values += array[i];
          }
          
          const average = values / length;
          const volumeLevel = Math.round(average);
          
          // Periodically log the volume level for debugging
          if (Math.random() < 0.01) { // Only log ~1% of the time to avoid console spam
            console.log("Current volume level:", volumeLevel);
          }
          
          // Detect speech vs silence
          if (volumeLevel > silenceThreshold) {
            // Reset silence timer when sound is detected
            silenceStartTime = Date.now();
            
            if (!isSpeaking) {
              isSpeaking = true;
              speechStartTime = Date.now();
              console.log("Speech detected, starting recording. Volume level:", volumeLevel);
              
              // Initialize a new recorder for this speech segment
              currentRecorder = new MicRecorder({ bitRate: 128 });
              currentRecorder.start().then(() => {
                onSpeechStart();
                
                // Set safety timer to ensure recording stops even if silence detection fails
                if (safetyTimer) {
                  window.clearTimeout(safetyTimer);
                }
                safetyTimer = window.setTimeout(forceStopRecording, MAX_RECORDING_TIME);
              });
            } else {
              // Update safety timer when speech continues
              const recordingDuration = Date.now() - speechStartTime;
              if (recordingDuration > MAX_RECORDING_TIME - 1000 && recordingDuration % 1000 < 50) {
                console.log("Recording approaching max time:", recordingDuration);
              }
            }
          } else {
            // Handle silence
            const currentSilenceDuration = Date.now() - silenceStartTime;
            
            // Log significant silence durations
            if (isSpeaking && currentSilenceDuration > 200 && currentSilenceDuration % 200 < 50) {
              console.log("Silence duration:", currentSilenceDuration, "ms, threshold:", silenceDuration);
            }
            
            if (isSpeaking && (currentSilenceDuration > silenceDuration)) {
              console.log("Speech ended. Silence detected for", currentSilenceDuration, "ms");
              
              if (currentRecorder) {
                console.log("Stopping recording");
                isSpeaking = false;
                
                // Clear safety timer when stopping naturally
                if (safetyTimer) {
                  window.clearTimeout(safetyTimer);
                  safetyTimer = null;
                }
                
                try {
                  currentRecorder.stop().getMp3().then(([_buffer, blob]) => {
                    onSpeechEnd(blob);
                  }).catch(err => {
                    console.error("Error stopping recording:", err);
                    const emptyBlob = new Blob([], { type: 'audio/mp3' });
                    onSpeechEnd(emptyBlob);
                  });
                } catch (error) {
                  console.error("Error stopping recording:", error);
                  const emptyBlob = new Blob([], { type: 'audio/mp3' });
                  onSpeechEnd(emptyBlob);
                }
                
                // Optional silence callback
                if (onSilence) {
                  onSilence();
                }
              }
            }
          }
        };
      })
      .catch((err) => {
        console.error("Error accessing microphone:", err);
        continuousListeningActive = false;
      });
      
    return true;
  } catch (error) {
    console.error("Error initializing continuous listening:", error);
    return false;
  }
}

/**
 * Stop continuous listening mode and release resources
 */
export function stopContinuousListening() {
  if (!continuousListeningActive) return;
  
  console.log("Stopping continuous listening");
  
  if (javascriptNode) {
    javascriptNode.onaudioprocess = null;
    javascriptNode.disconnect();
    javascriptNode = null;
  }
  
  if (microphone) {
    microphone.disconnect();
    microphone = null;
  }
  
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  
  continuousListeningActive = false;
} 