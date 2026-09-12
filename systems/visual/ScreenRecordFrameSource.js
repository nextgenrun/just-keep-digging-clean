// Read the completed WebGL framebuffer rather than the browser's canvas copy.
// Buffers are reused for the duration of a recording.
export class ScreenRecordFrameSource {
  constructor(renderer) {
    this.gl = renderer?.gl || null;
    this.canvas = null;
    this.context = null;
    this.pixels = null;
    this.frame = null;
  }

  read(source) {
    const gl = this.gl;
    if (!gl) return source;
    if (gl.isContextLost()) return null;
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (!width || !height) return null;
    if (!this.canvas || this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas ||= document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      this.context = this.canvas.getContext('2d');
      this.frame = this.context.createImageData(width, height);
      this.pixels = new Uint8Array(this.frame.data.length);
    }
    const previous = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixels);
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, previous);
    }
    const stride = width * 4;
    for (let row = 0; row < height; row += 1) {
      const start = (height - row - 1) * stride;
      this.frame.data.set(this.pixels.subarray(start, start + stride), row * stride);
    }
    this.context.putImageData(this.frame, 0, 0);
    return this.canvas;
  }
}
