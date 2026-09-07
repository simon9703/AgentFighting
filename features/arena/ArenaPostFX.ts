import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const ArenaGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    flash: { value: 0 },
    energy: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float flash;
    uniform float energy;
    varying vec2 vUv;
    void main() {
      vec2 centered = vUv - 0.5;
      float distanceFromCenter = length(centered);
      float vignette = smoothstep(0.82, 0.34, distanceFromCenter);
      vec2 offset = centered * 0.004 * energy;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 color = vec3(r, g, b);
      color *= mix(0.72, 1.0, vignette);
      color += vec3(0.22, 0.25, 0.3) * flash;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/** Optional presentation-only post-processing. Safe to disable on low quality devices. */
export class ArenaPostFX {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;
  private flash = 0;
  private energy = 0;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, enabled = true) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), enabled ? 0.46 : 0.16, 0.65, 0.8);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(ArenaGradeShader);
    this.composer.addPass(this.grade);
  }

  resize(width: number, height: number) {
    this.composer.setSize(Math.max(1, width), Math.max(1, height));
  }

  hit(strength = 0.35) {
    this.flash = Math.max(this.flash, strength);
    this.energy = Math.max(this.energy, strength * 0.85);
  }

  setChaos(active: boolean) {
    this.bloom.strength = active ? 0.68 : 0.46;
    this.energy = Math.max(this.energy, active ? 0.24 : 0);
  }

  update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 2.8);
    this.energy = Math.max(0, this.energy - dt * 1.5);
    this.grade.uniforms.flash.value = this.flash;
    this.grade.uniforms.energy.value = this.energy;
  }

  render() {
    this.composer.render();
  }

  dispose() {
    this.composer.dispose();
    this.bloom.dispose();
    this.grade.dispose();
  }
}
