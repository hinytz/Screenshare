class PcmSource extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.port.onmessage = (event) => {
      const raw = event.data;
      const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
      if (bytes.byteLength < 4) return;
      const floats = new Float32Array(
        bytes.buffer,
        bytes.byteOffset,
        Math.floor(bytes.byteLength / 4)
      );
      this.queue.push(floats);
    };
  }

  process(_inputs, outputs) {
    const left = outputs[0][0];
    const right = outputs[0][1] || outputs[0][0];
    if (!left) return true;

    for (let i = 0; i < left.length; i++) {
      if (this.queue.length === 0) {
        left[i] = 0;
        right[i] = 0;
        continue;
      }
      const chunk = this.queue[0];
      left[i] = chunk[this.offset] || 0;
      right[i] = chunk[this.offset + 1] || left[i];
      this.offset += 2;
      if (this.offset + 1 >= chunk.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-source', PcmSource);
