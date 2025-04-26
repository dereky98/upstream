// types/mic-recorder-to-mp3.d.ts
declare module "mic-recorder-to-mp3" {
    interface Mp3Blob { blob: Blob; buffer: BlobPart[] }
  
    interface RecorderOptions {
      bitRate?: number;        // kbps, default 128
      encoderPath?: string;    // custom lame-encoder wasm
    }
  
    export default class MicRecorder {
      constructor(opts?: RecorderOptions);
      start(): Promise<void>;
      stop(): { getMp3(): Promise<[BlobPart[], Blob]> };
      getMediaStream(): Promise<MediaStream>;
    }
  }
  