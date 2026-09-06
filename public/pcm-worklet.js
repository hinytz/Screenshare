class PcmSource extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.pending = new Uint8Array(0);
    this.port.onmessage = (event) => {
      const raw = event.data;
      const incoming = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
      if (!incoming.byteLength) return;
      const merged = new Uint8Array(this.pending.length + incoming.length);
      merged.set(this.pending, 0);
      merged.set(incoming, this.pending.length);
      const usable = merged.byteLength - (merged.byteLength % 8);
      if (usable >= 8) {
        const copy = merged.slice(0, usable);
        this.queue.push(new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4));
      }
      this.pending = merged.slice(usable);
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
