import * as THREE from "../libs/three-r180/three.module.min.js";
import { GLTFLoader } from "../libs/three-r180/GLTFLoader.js";
import { PLAYER_SKELETAL_RUN as CONFIG } from "../values/playerSkeletalRun.js";

/** Animates the original bones and renders their skinned mesh into one live canvas. */
export class SkeletalRunMeshRenderer {
  constructor() {
    this.disposed = false;
    this.model = null;
    this.renderer = null;
    this.framesRendered = 0;
  }

  async load() {
    const gltf = await new GLTFLoader().loadAsync(CONFIG.assetPath);
    this.model = gltf.scene;
    if (this.disposed) { this.dispose(); return false; }
    const clip = gltf.animations.find(item => item.name === CONFIG.clipName);
    if (!clip) throw new Error("Retained skeletal jog is missing from the run asset");
    this.clipDuration = clip.duration;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.runAction = this.mixer.clipAction(clip).play();
    this.action = this.runAction;
    const walkGltf = await new GLTFLoader().loadAsync(CONFIG.walk.assetPath);
    if (this.disposed) { this.dispose(); return false; }
    const walkClip = walkGltf.animations.find(item => item.name === CONFIG.walk.clipName);
    if (!walkClip) throw new Error("Original Standard Walk is missing from the walking asset");
    this.walkAction = this.mixer.clipAction(walkClip);
    this.mixer.update(0);
    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model);
    const height = bounds.max.y - bounds.min.y;
    if (!(height > 0)) throw new Error("Skeletal run has empty mesh bounds");
    this.model.scale.multiplyScalar(1 / height);
    this.model.position.sub(new THREE.Vector3(
      (bounds.min.x + bounds.max.x) / 2, bounds.min.y,
      (bounds.min.z + bounds.max.z) / 2,
    ).multiplyScalar(1 / height));
    this.scene = new THREE.Scene();
    this.scene.add(this.model);
    this.scene.add(new THREE.HemisphereLight(
      CONFIG.ambient.sky, CONFIG.ambient.ground, CONFIG.ambient.intensity,
    ));
    for (const spec of [CONFIG.keyLight, CONFIG.fillLight]) {
      const light = new THREE.DirectionalLight(spec.color, spec.intensity);
      light.position.set(...spec.position);
      this.scene.add(light);
    }
    const half = CONFIG.cameraExtent / 2;
    this.camera = new THREE.OrthographicCamera(-half, half, half, -half, CONFIG.near, CONFIG.far);
    this.camera.position.set(...CONFIG.cameraOffset);
    this.camera.position.y += CONFIG.cameraTargetHeight;
    this.camera.lookAt(0, CONFIG.cameraTargetHeight, 0);
    this.renderer = new THREE.WebGLRenderer({
      alpha: true, antialias: true, preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    this.renderer.setSize(CONFIG.resolution, CONFIG.resolution, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = CONFIG.exposure;
    const environmentScene = new THREE.Scene();
    environmentScene.background = new THREE.Color(CONFIG.environmentColor);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(environmentScene);
    pmrem.dispose();
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = CONFIG.environmentIntensity;
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  render(deltaMs, speed, tileSize, walking = false) {
    const nextAction = walking ? this.walkAction : this.runAction;
    if (nextAction !== this.action) {
      const phase = this.action.time / this.clipDuration;
      nextAction.reset().play();
      nextAction.time = phase * nextAction.getClip().duration;
      this.action.crossFadeTo(nextAction, CONFIG.gaitBlendSeconds, false);
      this.action = nextAction;
      this.clipDuration = nextAction.getClip().duration;
    }
    const gait = walking ? CONFIG.walk : CONFIG;
    const rate = this.clipDuration * speed / (tileSize * gait.strideTilesPerCycle);
    this.action.timeScale = Math.max(gait.minTimeScale, Math.min(CONFIG.maxTimeScale, rate));
    const previousPhase = this.action.time / this.clipDuration;
    this.mixer.update(Math.min(CONFIG.maxDeltaMs, Math.max(0, deltaMs)) / 1000);
    this.renderer.render(this.scene, this.camera);
    const phase = this.action.time / this.clipDuration;
    this.footstep = phase < previousPhase
      || Math.floor(phase * CONFIG.stepsPerCycle) > Math.floor(previousPhase * CONFIG.stepsPerCycle);
    this.framesRendered += 1;
    return this.renderer.domElement;
  }

  dispose() {
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.model) this.mixer?.uncacheRoot(this.model);
    const textures = new Set();
    const materials = new Set();
    this.model?.traverse(object => {
      object.geometry?.dispose();
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
    for (const material of materials) material.dispose();
    this.environment?.dispose();
    this.environment = null;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.model = null;
    this.renderer = null;
  }
}
