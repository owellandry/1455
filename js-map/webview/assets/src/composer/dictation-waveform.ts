export const WAVEFORM_SAMPLE_BAR_UI_WIDTH = 4;
export const WAVEFORM_SCALE_FACTOR = 10;
export const WAVEFORM_INITIAL_VALUE = 0.0025;
export const WAVEFORM_SAMPLING_RATE = 48000;
export const WAVEFORM_BUFFER_DURATION_SECS = 10;
export const WAVEFORM_MAX_BUFFER_SAMPLES =
  WAVEFORM_SAMPLING_RATE * WAVEFORM_BUFFER_DURATION_SECS;

export function formatRecordingDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function buildWaveformBars(
  waveform: Float32Array,
  containerWidth: number,
): { soundBars: Array<number>; firstAudioBarIndex: number } {
  if (containerWidth <= 0 || waveform.length === 0) {
    return { soundBars: [], firstAudioBarIndex: -1 };
  }
  const blocks = Math.max(
    1,
    Math.floor(containerWidth / WAVEFORM_SAMPLE_BAR_UI_WIDTH),
  );
  const samplesPerBlock = waveform.length / blocks;
  const soundBars: Array<number> = [];
  let firstAudioBarIndex = -1;

  for (let blockIndex = 0; blockIndex < blocks; blockIndex += 1) {
    const startIdx = Math.floor(blockIndex * samplesPerBlock);
    const endIdx = Math.min(
      Math.floor((blockIndex + 1) * samplesPerBlock),
      waveform.length,
    );
    if (startIdx >= endIdx) {
      soundBars.push(0);
      continue;
    }
    let sum = 0;
    for (let s = startIdx; s < endIdx; s += 1) {
      sum += Math.abs(waveform[s]);
    }
    const avgHeight = sum / (endIdx - startIdx);
    if (firstAudioBarIndex === -1 && avgHeight > WAVEFORM_INITIAL_VALUE) {
      firstAudioBarIndex = blockIndex;
    }
    soundBars.push(avgHeight);
  }

  return { soundBars, firstAudioBarIndex };
}
