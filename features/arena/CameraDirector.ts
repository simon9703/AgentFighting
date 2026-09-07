import * as THREE from 'three';

export type CameraMode = 'overview' | 'combat' | 'ko' | 'focus';

type CameraInput = {
  fighterPositions: THREE.Vector3[];
  focusTarget?: THREE.Vector3;
  emphasisTarget?: THREE.Vector3;
  dt: number;
  time: number;
};

/** Presentation-only camera state machine. It never writes to simulation state. */
export class CameraDirector {
  private mode: CameraMode = 'overview';
  private hold = 0;
  private shake = 0;
  private readonly lookAt = new THREE.Vector3();
  private readonly desired = new THREE.Vector3(14, 15, 18);

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly reducedMotion = false) {}

  setMode(mode: CameraMode, holdSeconds = 0.45) {
    this.mode = mode;
    this.hold = Math.max(this.hold, holdSeconds);
  }

  impact(amount: number, mode: CameraMode = 'combat') {
    this.shake = Math.max(this.shake, this.reducedMotion ? amount * 0.12 : amount);
    this.setMode(mode, this.reducedMotion ? 0.18 : mode === 'ko' ? 0.85 : 0.35);
  }

  update({ fighterPositions, focusTarget, emphasisTarget, dt, time }: CameraInput) {
    this.hold = Math.max(0, this.hold - dt);
    if (this.mode === 'focus' && !focusTarget) this.mode = 'overview';
    if (this.hold <= 0 && this.mode !== 'focus') this.mode = 'overview';

    const center = new THREE.Vector3();
    if (fighterPositions.length) {
      fighterPositions.forEach((position) => center.add(position));
      center.multiplyScalar(1 / fighterPositions.length);
    }

    const spread = fighterPositions.reduce((max, position) => Math.max(max, position.distanceTo(center)), 0);
    const target = this.mode === 'focus' && focusTarget
      ? focusTarget
      : emphasisTarget && (this.mode === 'combat' || this.mode === 'ko')
        ? emphasisTarget
        : center;

    const orbit = this.reducedMotion ? 0 : time * 0.12;
    const zoom = this.mode === 'ko' && !this.reducedMotion ? -3.8 : this.mode === 'combat' && !this.reducedMotion ? -2.1 : Math.min(4.8, spread * 0.4);
    const height = this.mode === 'ko' && !this.reducedMotion ? 11.8 : this.mode === 'combat' && !this.reducedMotion ? 13.2 : 15 + Math.max(0, zoom) * 0.22;
    const radiusX = 14 + zoom;
    const radiusZ = 18 + zoom;

    this.desired.set(
      target.x * 0.34 + radiusX + Math.sin(orbit) * (this.reducedMotion ? 0 : 1.25),
      height,
      target.z * 0.34 + radiusZ + Math.cos(orbit) * (this.reducedMotion ? 0 : 1.25),
    );

    const positionLerp = 1 - Math.pow(this.reducedMotion ? 0.08 : this.mode === 'ko' ? 0.003 : 0.02, dt);
    this.camera.position.lerp(this.desired, positionLerp);
    this.lookAt.lerp(new THREE.Vector3(target.x * 0.48, this.mode === 'ko' ? 0.85 : 0.48, target.z * 0.48), 1 - Math.pow(this.reducedMotion ? 0.08 : 0.01, dt));

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.45;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.04, dt);
    }

    this.camera.lookAt(this.lookAt);
  }
}
