declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: new () => AudioWorkletProcessor): void;

const CHUNK_FRAMES = 4096;

class CaptureProcessor extends AudioWorkletProcessor {
  private chunk = new Float32Array(CHUNK_FRAMES);
  private filled = 0;

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (channel) this.append(channel);
    return true;
  }

  private append(samples: Float32Array) {
    let read = 0;
    while (read < samples.length) {
      const n = Math.min(CHUNK_FRAMES - this.filled, samples.length - read);
      this.chunk.set(samples.subarray(read, read + n), this.filled);
      this.filled += n;
      read += n;
      if (this.filled === CHUNK_FRAMES) this.flush();
    }
  }

  private flush() {
    this.port.postMessage(this.chunk, [this.chunk.buffer]);
    this.chunk = new Float32Array(CHUNK_FRAMES);
    this.filled = 0;
  }
}

registerProcessor("capture", CaptureProcessor);
