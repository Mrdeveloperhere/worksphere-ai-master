"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export function useVoiceTranscriber() {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const simIntervalRef = useRef<any>(null);

  const stopTranscribing = useCallback(() => {
    setIsRecording(false);

    // Stop simulation timer if active
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop audio processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Gracefully terminate AssemblyAI websocket
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "Terminate" }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  // Simulates Speech-to-Text streaming if physical mic device is missing
  const runSimulation = useCallback(
    (onPartial: (text: string) => void, onFinal: (text: string) => void) => {
      setIsRecording(true);
      toast.info("Microphone device not found. Starting simulated voice demonstration instead!");

      const demoText =
        "Please confirm that the YouTube video is live. I also need to brainstorm future content and document the details of my new sponsorships.";
      const words = demoText.split(" ");
      let index = 0;
      let buffer: string[] = [];

      simIntervalRef.current = setInterval(() => {
        if (index >= words.length) {
          if (buffer.length > 0) {
            onFinal(buffer.join(" "));
          }
          stopTranscribing();
          toast.success("Voice simulation demonstration complete.");
          return;
        }

        const word = words[index];
        buffer.push(word);
        onPartial(buffer.join(" "));

        // Finalize speech segments on punctuation or length boundaries
        if (buffer.length >= 4 || word.endsWith(".") || word.endsWith(",")) {
          onFinal(buffer.join(" "));
          buffer = [];
        }

        index++;
      }, 400); // conversational reading pace
    },
    [stopTranscribing]
  );

  const startTranscribing = useCallback(
    async (
      onPartial: (text: string) => void,
      onFinal: (text: string) => void
    ) => {
      try {
        // 1. Fetch token from server route
        const tokenRes = await fetch("/api/assemblyai/token");
        if (!tokenRes.ok) {
          const errData = await tokenRes.json();
          throw new Error(errData.error || "Failed to fetch AssemblyAI token");
        }
        const { token } = await tokenRes.json();

        // 2. Request microphone permission
        let stream: MediaStream;
        try {
          // Use simple audio constraints to prevent driver mismatches or OverconstrainedError.
          // Our Web Audio downsampler converts the captured buffer to 16kHz mono.
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
        } catch (deviceError: any) {
          console.warn("Microphone access failed", deviceError);
          const isDenied = deviceError.name === "NotAllowedError" || deviceError.name === "PermissionDeniedError";
          if (isDenied) {
            toast.error("Microphone permission denied. Please enable mic permissions in your browser settings to speak.");
          } else {
            runSimulation(onPartial, onFinal);
          }
          return;
        }

        // 3. Initialize AudioContext and capture source
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);

        // 4. Connect WebSocket directly to AssemblyAI streaming API
        const wsUrl = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=universal-3-5-pro&mode=balanced&token=${token}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          setIsRecording(true);
          toast.success("Voice recording started. Speak now!");
        };

        socket.onerror = (e) => {
          console.error("AssemblyAI WebSocket error:", e);
          toast.error("WebSocket connection error");
          stopTranscribing();
        };

        socket.onclose = () => {
          setIsRecording(false);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "Turn") {
              if (data.end_of_turn) {
                onFinal(data.transcript);
              } else {
                onPartial(data.transcript);
              }
            }
          } catch (err) {
            console.error("Error parsing socket message:", err);
          }
        };

        // 5. Downsample and process audio via ScriptProcessorNode
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const inputSampleRate = audioContext.sampleRate;
        const outputSampleRate = 16000;

        processor.onaudioprocess = (e) => {
          if (socket.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Downsample float32 buffer to 16000Hz
          const downsampled = downsampleBuffer(inputData, inputSampleRate, outputSampleRate);
          
          // Convert float32 downsampled samples to int16 PCM buffer
          const pcmBuffer = new ArrayBuffer(downsampled.length * 2);
          const view = new DataView(pcmBuffer);
          floatTo16BitPCM(view, 0, downsampled);

          // Stream binary int16 buffer chunk to WebSocket
          socket.send(pcmBuffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

      } catch (error: any) {
        console.error("Error starting speech transcription:", error);
        toast.error(error.message || "Failed to start recording");
        stopTranscribing();
      }
    },
    [runSimulation, stopTranscribing]
  );

  return {
    isRecording,
    startTranscribing,
    stopTranscribing,
  };
}

// Downsamples Float32Array to target sample rate
function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return buffer;
  }
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Converts Float32 values to Int16 bytes
function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}
