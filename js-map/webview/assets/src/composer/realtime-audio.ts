import type { ThreadRealtimeAudioChunk } from "app-server-types/v2";

import { MessageBus } from "@/message-bus";

type AudioChunkHandler = (audio: ThreadRealtimeAudioChunk) => void;

const CAPTURE_BUFFER_SIZE = 2048;
const PLAYER_BUFFER_SIZE = 4096;
const MODEL_AUDIO_SAMPLE_RATE = 24_000;
const MODEL_AUDIO_CHANNELS = 1;

export class RealtimeAudioCapture {
  private constructor(
    private readonly stream: MediaStream,
    private readonly audioContext: AudioContext,
    private readonly source: MediaStreamAudioSourceNode,
    private readonly processor: ScriptProcessorNode,
    private readonly sink: GainNode,
  ) {}

  static async start(
    onAudioChunk: AudioChunkHandler,
  ): Promise<RealtimeAudioCapture> {
    if (
      typeof AudioContext === "undefined" ||
      navigator.mediaDevices?.getUserMedia == null
    ) {
      throw new Error("Realtime audio capture is not available");
    }

    MessageBus.getInstance().dispatchMessage(
      "electron-request-microphone-permission",
      {},
    );

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1 },
    });
    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(
      CAPTURE_BUFFER_SIZE,
      1,
      1,
    );
    const sink = audioContext.createGain();
    sink.gain.value = 0;

    processor.onaudioprocess = (event): void => {
      const input = event.inputBuffer;
      const samples = readInputBufferPcm16(input);
      if (samples.length === 0) {
        return;
      }

      const converted = convertPcm16(
        samples,
        audioContext.sampleRate,
        input.numberOfChannels,
        MODEL_AUDIO_SAMPLE_RATE,
        MODEL_AUDIO_CHANNELS,
      );
      if (converted.length === 0) {
        return;
      }

      onAudioChunk({
        data: encodePcm16Base64(converted),
        sampleRate: MODEL_AUDIO_SAMPLE_RATE,
        numChannels: MODEL_AUDIO_CHANNELS,
        samplesPerChannel: converted.length / MODEL_AUDIO_CHANNELS || null,
        itemId: null,
      });
    };

    source.connect(processor);
    processor.connect(sink);
    sink.connect(audioContext.destination);

    return new RealtimeAudioCapture(
      stream,
      audioContext,
      source,
      processor,
      sink,
    );
  }

  getStream(): MediaStream {
    return this.stream;
  }

  stop(): void {
    this.processor.onaudioprocess = null;
    this.source.disconnect();
    this.processor.disconnect();
    this.sink.disconnect();
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });
    void this.audioContext.close();
  }
}

export class RealtimeAudioPlayer {
  private readonly audioContext: AudioContext;
  private readonly processor: ScriptProcessorNode;
  private readonly queue: Array<number> = [];
  private queueOffset = 0;

  constructor() {
    if (typeof AudioContext === "undefined") {
      throw new Error("Realtime audio playback is not available");
    }

    this.audioContext = new AudioContext();
    this.processor = this.audioContext.createScriptProcessor(
      PLAYER_BUFFER_SIZE,
      0,
      this.outputChannels,
    );

    this.processor.onaudioprocess = (event): void => {
      const output = event.outputBuffer;

      for (let frameIndex = 0; frameIndex < output.length; frameIndex += 1) {
        for (
          let channelIndex = 0;
          channelIndex < output.numberOfChannels;
          channelIndex += 1
        ) {
          const channel = output.getChannelData(channelIndex);
          channel[frameIndex] = this.readNextSample() / 32768;
        }
      }
    };

    this.processor.connect(this.audioContext.destination);
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  }

  get outputChannels(): number {
    return Math.max(1, this.audioContext.destination.channelCount || 1);
  }

  enqueueChunk(audio: ThreadRealtimeAudioChunk): void {
    if (audio.numChannels <= 0 || audio.sampleRate <= 0) {
      return;
    }

    const samples = decodePcm16Base64(audio.data);
    if (samples.length === 0) {
      return;
    }

    const converted = convertPcm16(
      samples,
      audio.sampleRate,
      audio.numChannels,
      this.audioContext.sampleRate,
      this.outputChannels,
    );
    if (converted.length === 0) {
      return;
    }

    for (let index = 0; index < converted.length; index += 1) {
      this.queue.push(converted[index] ?? 0);
    }
  }

  clear(): void {
    this.queue.length = 0;
    this.queueOffset = 0;
  }

  stop(): void {
    this.clear();
    this.processor.onaudioprocess = null;
    this.processor.disconnect();
    void this.audioContext.close();
  }

  private readNextSample(): number {
    if (this.queueOffset >= this.queue.length) {
      this.queue.length = 0;
      this.queueOffset = 0;
      return 0;
    }

    const sample = this.queue[this.queueOffset] ?? 0;
    this.queueOffset += 1;

    if (
      this.queueOffset >= PLAYER_BUFFER_SIZE &&
      this.queueOffset * 2 >= this.queue.length
    ) {
      this.queue.splice(0, this.queueOffset);
      this.queueOffset = 0;
    }

    return sample;
  }
}

function readInputBufferPcm16(inputBuffer: AudioBuffer): Int16Array {
  const { length, numberOfChannels } = inputBuffer;
  if (length === 0 || numberOfChannels === 0) {
    return new Int16Array(0);
  }

  const samples = new Int16Array(length * numberOfChannels);
  let sampleIndex = 0;

  for (let frameIndex = 0; frameIndex < length; frameIndex += 1) {
    for (
      let channelIndex = 0;
      channelIndex < numberOfChannels;
      channelIndex += 1
    ) {
      const channel = inputBuffer.getChannelData(channelIndex);
      const sample = channel[frameIndex] ?? 0;
      samples[sampleIndex] = floatSampleToInt16(sample);
      sampleIndex += 1;
    }
  }

  return samples;
}

function floatSampleToInt16(sample: number): number {
  return Math.round(Math.max(-1, Math.min(1, sample)) * 32767);
}

function encodePcm16Base64(samples: ArrayLike<number>): string {
  const bytes = new Uint8Array(samples.length * 2);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] ?? 0;
    const normalized = Math.max(-32768, Math.min(32767, sample));
    const unsignedSample = normalized < 0 ? normalized + 65536 : normalized;
    const byteIndex = index * 2;
    bytes[byteIndex] = unsignedSample % 256;
    bytes[byteIndex + 1] = Math.floor(unsignedSample / 256);
  }

  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary);
}

function decodePcm16Base64(data: string): Int16Array {
  const binary = atob(data);
  if (binary.length % 2 !== 0) {
    return new Int16Array(0);
  }

  const samples = new Int16Array(binary.length / 2);
  for (let index = 0; index < samples.length; index += 1) {
    const byteIndex = index * 2;
    const low = binary.charCodeAt(byteIndex);
    const high = binary.charCodeAt(byteIndex + 1);
    const value = low + high * 256;
    samples[index] = value > 32767 ? value - 65536 : value;
  }
  return samples;
}

function convertPcm16(
  input: ArrayLike<number>,
  inputSampleRate: number,
  inputChannels: number,
  outputSampleRate: number,
  outputChannels: number,
): Int16Array {
  if (
    input.length === 0 ||
    inputChannels <= 0 ||
    outputChannels <= 0 ||
    inputSampleRate <= 0 ||
    outputSampleRate <= 0
  ) {
    return new Int16Array(0);
  }

  const inputFrameCount = Math.floor(input.length / inputChannels);
  if (inputFrameCount === 0) {
    return new Int16Array(0);
  }

  const outputFrameCount =
    inputSampleRate === outputSampleRate
      ? inputFrameCount
      : Math.max(
          1,
          Math.floor((inputFrameCount * outputSampleRate) / inputSampleRate),
        );

  const output = new Int16Array(outputFrameCount * outputChannels);
  let outputIndex = 0;

  for (
    let outputFrameIndex = 0;
    outputFrameIndex < outputFrameCount;
    outputFrameIndex += 1
  ) {
    const sourceFrameIndex =
      outputFrameCount <= 1 || inputFrameCount <= 1
        ? 0
        : Math.floor(
            (outputFrameIndex * (inputFrameCount - 1)) / (outputFrameCount - 1),
          );
    const sourceStart = sourceFrameIndex * inputChannels;

    if (inputChannels === 1 && outputChannels === 1) {
      output[outputIndex] = input[sourceStart] ?? 0;
      outputIndex += 1;
      continue;
    }

    if (inputChannels === 1) {
      const sample = input[sourceStart] ?? 0;
      for (
        let channelIndex = 0;
        channelIndex < outputChannels;
        channelIndex += 1
      ) {
        output[outputIndex] = sample;
        outputIndex += 1;
      }
      continue;
    }

    if (outputChannels === 1) {
      let sum = 0;
      for (
        let channelIndex = 0;
        channelIndex < inputChannels;
        channelIndex += 1
      ) {
        sum += input[sourceStart + channelIndex] ?? 0;
      }
      output[outputIndex] = Math.round(sum / inputChannels);
      outputIndex += 1;
      continue;
    }

    if (inputChannels === outputChannels) {
      for (
        let channelIndex = 0;
        channelIndex < outputChannels;
        channelIndex += 1
      ) {
        output[outputIndex] = input[sourceStart + channelIndex] ?? 0;
        outputIndex += 1;
      }
      continue;
    }

    if (inputChannels > outputChannels) {
      for (
        let channelIndex = 0;
        channelIndex < outputChannels;
        channelIndex += 1
      ) {
        output[outputIndex] = input[sourceStart + channelIndex] ?? 0;
        outputIndex += 1;
      }
      continue;
    }

    const lastSample = input[sourceStart + inputChannels - 1] ?? 0;
    for (
      let channelIndex = 0;
      channelIndex < outputChannels;
      channelIndex += 1
    ) {
      output[outputIndex] =
        channelIndex < inputChannels
          ? (input[sourceStart + channelIndex] ?? 0)
          : lastSample;
      outputIndex += 1;
    }
  }

  return output;
}
