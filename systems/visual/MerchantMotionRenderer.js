import { MERCHANT_MOTION_CONFIG as C } from '../../values/merchantMotion.js';
import { createMesh, samplePose } from './merchantMotionMath.js';
import { createMerchantActivityCast } from './merchantActivityMotion.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './merchantMotionShaders.js';

export class MerchantMotionRenderer {
  constructor(canvas, image, cast, rig, foot, ownsContext = true) {
    this.ownsContext = ownsContext;
    this.canvas = canvas; this.image = image; this.cast = cast; this.rig = rig; this.foot = foot;
    this.activityImages = {}; this.activityTexture = null; this.activityMesh = null;
    this.activityRig = rig.filter(bone => ['body', 'head'].includes(bone.name));
    this.activityCast = createMerchantActivityCast(cast);
    const gl = this.gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) throw new Error('Merchant motion needs WebGL 2');
    this.onContextLost = event => { event.preventDefault(); this.lost = true; };
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    try {
      const shader = (type, source) => {
        const handle = gl.createShader(type);
        gl.shaderSource(handle, source); gl.compileShader(handle);
        if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(handle));
        return handle;
      };
      const vertex = shader(gl.VERTEX_SHADER, VERTEX_SHADER), fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertex); gl.attachShader(this.program, fragment); gl.linkProgram(this.program);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
      gl.deleteShader(vertex); gl.deleteShader(fragment); gl.useProgram(this.program);
      this.mesh = this._createGeometry(rig);
      this.texture = this._uploadImage(image);
      gl.enable(gl.BLEND); gl.clearColor(0,0,0,0);
      this.uniforms = Object.fromEntries(['uBones','uViewport','uOrigin','uScale','uGlowKind','uGlow','uLodBias','uOpacity'].map(name => [name, gl.getUniformLocation(this.program, name)]));
      gl.uniform1f(this.uniforms.uLodBias, C.textureLodBias);
    } catch (error) { this.destroy(); throw error; }
  }
  _createGeometry(rig) {
    const gl = this.gl, mesh = createMesh(rig, this.foot);
    const geometry = { vao: gl.createVertexArray(), vertex: gl.createBuffer(), index: gl.createBuffer(), count: mesh.indices.length };
    gl.bindVertexArray(geometry.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.vertex); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometry.index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    for (const [name, size, offset] of [['aPosition',2,0],['aBones',4,2],['aWeights',4,6]]) {
      const location = gl.getAttribLocation(this.program, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, mesh.stride * 4, offset * 4);
    }
    return geometry;
  }
  _uploadImage(image, texture = this.gl.createTexture()) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
  }
  setActivityImages(images) { this.activityImages = images; }
  _layer(texture, mesh, pose, opacity, painted = false) {
    if (opacity <= 0) return;
    const gl = this.gl, u = this.uniforms;
    gl.bindVertexArray(mesh.vao); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniformMatrix3fv(u.uBones, false, pose.packed);
    gl.uniform1f(u.uOpacity, opacity);
    const glow = painted && ['gold', 'lamp'].includes(this.cast.glow) ? 'none' : this.cast.glow;
    gl.uniform1i(u.uGlowKind, ['none','gold','crystal','magma','lamp'].indexOf(glow));
    gl.uniform1f(u.uGlow, C.emissionIdle + (painted ? 0 : pose.envelope * C.emissionAction));
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }
  draw(time, actionTime, layout, strength = 1, clear = true, activity = null) {
    const { canvas, gl } = this;
    if (this.lost || gl.isContextLost()) throw new Error('Merchant motion context was lost');
    const { width, height, size, origin } = layout;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (clear) gl.clear(gl.COLOR_BUFFER_BIT);
    const activityImage = this.activityImages[activity?.id];
    const blend = activityImage ? activity.blend : 0;
    const pose = samplePose(this.cast, this.rig, time, activityImage ? -1 : actionTime, strength);
    gl.useProgram(this.program);
    // Both layers are weighted premultiplied pixels: no darkening halfway through.
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform2f(this.uniforms.uViewport, width, height);
    gl.uniform2fv(this.uniforms.uOrigin, origin);
    gl.uniform1f(this.uniforms.uScale, size / C.referenceSize);
    this._layer(this.texture, this.mesh, pose, 1 - blend);
    if (blend > 0) {
      this.activityMesh ||= this._createGeometry(this.activityRig);
      if (this.uploadedActivityId !== activity.id) {
        this.activityTexture = this._uploadImage(activityImage, this.activityTexture || undefined);
        this.uploadedActivityId = activity.id;
      }
      const activityPose = samplePose(this.activityCast, this.activityRig, time, activity.shopTime ?? -1, strength);
      this._layer(this.activityTexture, this.activityMesh, activityPose, blend, true);
    }
    this.lastPose = pose; this.lastLayout = layout;
    this.lastActivityId = blend > 0 ? activity.id : null;
  }
  destroy() {
    this.canvas?.removeEventListener('webglcontextlost', this.onContextLost);
    const gl = this.gl;
    if (!gl) return;
    for (const mesh of [this.mesh, this.activityMesh]) if (mesh) {
      gl.deleteBuffer(mesh.vertex); gl.deleteBuffer(mesh.index); gl.deleteVertexArray(mesh.vao);
    }
    gl.deleteTexture(this.texture); gl.deleteTexture(this.activityTexture); gl.deleteProgram(this.program);
    if (this.ownsContext) gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null; this.image = null; this.activityImages = {};
  }
}
