import { MERCHANT_MOTION_CONFIG as M } from '../../../values/merchantMotion.js';
import { MERCHANT_IDLE_PERSONALITY as C } from '../../../values/merchantIdlePersonalitySandbox.js';
import { createMesh, samplePose } from '../../../systems/visual/merchantMotionMath.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../../../systems/visual/merchantMotionShaders.js';

// Reuse the current paint shader, with premultiplied opacity for a short pose dissolve.
const fragment = FRAGMENT_SHADER;

export class PersonalityRenderer {
  constructor(canvas, cast, rig, foot, images) {
    this.canvas = canvas; this.cast = cast; this.foot = foot;
    this.rig = rig; this.poseRig = rig.filter(bone => ['body', 'head'].includes(bone.name));
    this.poseCast = { ...cast, motion: {
      body: { idleAngle: C.poseBodyAngle, idleY: C.poseBodyLift },
      head: { idleAngle: C.poseHeadAngle, idleY: C.poseHeadLift },
    } };
    this.meshes = []; this.textures = new Map();
    this.onLost = event => { event.preventDefault(); this.lost = true; };
    canvas.addEventListener('webglcontextlost', this.onLost);
    const gl = this.gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) throw new Error('This preview requires WebGL 2.');
    try {
      const shader = (type, source) => {
        const value = gl.createShader(type);
        gl.shaderSource(value, source); gl.compileShader(value);
        if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
          const message = gl.getShaderInfoLog(value); gl.deleteShader(value); throw new Error(message);
        }
        return value;
      };
      const vertex = shader(gl.VERTEX_SHADER, VERTEX_SHADER), pixel = shader(gl.FRAGMENT_SHADER, fragment);
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertex); gl.attachShader(this.program, pixel); gl.linkProgram(this.program);
      gl.deleteShader(vertex); gl.deleteShader(pixel);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
      this.baseMesh = this.makeMesh(rig);
      this.poseMesh = this.makeMesh(this.poseRig);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      for (const [id, image] of Object.entries(images)) {
        const texture = gl.createTexture(); this.textures.set(id, texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);
      }
      gl.useProgram(this.program);
      this.uniforms = Object.fromEntries(['uBones', 'uViewport', 'uOrigin', 'uScale', 'uGlowKind', 'uGlow', 'uLodBias', 'uOpacity']
        .map(name => [name, gl.getUniformLocation(this.program, name)]));
      gl.uniform1f(this.uniforms.uLodBias, M.textureLodBias);
      gl.enable(gl.BLEND);
      // Weighted premultiplied layers add to a true crossfade, without an opacity dip.
      gl.blendFunc(gl.ONE, gl.ONE); gl.clearColor(0, 0, 0, 0);
    } catch (error) { this.destroy(); throw error; }
  }
  makeMesh(rig) {
    const gl = this.gl, mesh = createMesh(rig, this.foot);
    const handles = { vao: gl.createVertexArray(), vertex: gl.createBuffer(), index: gl.createBuffer(), count: mesh.indices.length };
    this.meshes.push(handles);
    gl.bindVertexArray(handles.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, handles.vertex); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, handles.index); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    for (const [name, size, offset] of [['aPosition', 2, 0], ['aBones', 4, 2], ['aWeights', 4, 6]]) {
      const location = gl.getAttribLocation(this.program, name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, mesh.stride * 4, offset * 4);
    }
    return handles;
  }
  layer(textureId, pose, mesh, origin, size, opacity, paintedPose = false) {
    if (opacity <= 0) return;
    const gl = this.gl, u = this.uniforms;
    gl.bindVertexArray(mesh.vao); gl.bindTexture(gl.TEXTURE_2D, this.textures.get(textureId));
    gl.uniformMatrix3fv(u.uBones, false, pose.packed);
    gl.uniform2fv(u.uOrigin, origin); gl.uniform1f(u.uScale, size / M.referenceSize); gl.uniform1f(u.uOpacity, opacity);
    // Only color-based glow masks follow the alternate paintings.
    const glow = paintedPose && ['gold', 'lamp'].includes(this.cast.glow) ? 'none' : this.cast.glow;
    gl.uniform1i(u.uGlowKind, ['none', 'gold', 'crystal', 'magma', 'lamp'].indexOf(glow));
    gl.uniform1f(u.uGlow, M.emissionIdle + (paintedPose ? 0 : pose.envelope * M.emissionAction));
    gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }
  draw(time, activity, { compare, gameSize }) {
    const canvas = this.canvas, gl = this.gl;
    if (this.lost || gl.isContextLost()) throw new Error('The preview lost its graphics context. Reload to reconnect.');
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio || 1, C.maxPixelRatio);
    const backingWidth = Math.round(width * ratio), backingHeight = Math.round(height * ratio);
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) { canvas.width = backingWidth; canvas.height = backingHeight; }
    gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.uViewport, width, height);
    const paneWidth = width / (compare ? 2 : 1);
    const size = gameSize || Math.min(height * C.detailFit, paneWidth * C.paneFit);
    const left = [(paneWidth - size) / 2, height * C.groundFraction - this.foot * size / M.referenceSize];
    if (compare) this.layer('idle', samplePose(this.cast, this.rig, time, activity.actionTime), this.baseMesh, left, size, 1);
    const right = [left[0] + (compare ? paneWidth : 0), left[1]];
    this.layer('idle', samplePose(this.cast, this.rig, time, -1), this.baseMesh, right, size, 1 - activity.mix);
    if (activity.mix > 0) this.layer(activity.activity, samplePose(this.poseCast, this.poseRig, time, -1), this.poseMesh, right, size, activity.mix, true);
    canvas.dataset.spriteSize = size.toFixed(2);
    canvas.dataset.pose = activity.activity || 'idle';
    canvas.dataset.mix = activity.mix.toFixed(3);
    canvas.dataset.actionTime = activity.actionTime.toFixed(3);
    canvas.dataset.foot = (height * C.groundFraction).toFixed(2);
  }
  destroy() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    const gl = this.gl;
    if (!gl) return;
    for (const mesh of this.meshes) { gl.deleteBuffer(mesh.vertex); gl.deleteBuffer(mesh.index); gl.deleteVertexArray(mesh.vao); }
    for (const texture of this.textures.values()) gl.deleteTexture(texture);
    gl.deleteProgram(this.program); gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.gl = null;
  }
}
