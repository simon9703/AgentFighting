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
  private readonly lookAt = new THREE.Vector3(0, 1.15, 0);
  private readonly desired = new THREE.Vector3(14.8, 10.6, 18.8);

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly reducedMotion = false) {}

  setMode(mode: CameraMode, holdSeconds = 0.45) {
    this.mode = mode;
    this.hold = Math.max(this.hold, holdSeconds);
  }

  impact(amount: number, mode: CameraMode = 'combat') {
    const scaled = this.reducedMotion ? amount * 0.08 : amount * 0.28;
    this.shake = Math.max(this.shake, scaled);
    this.setMode(mode, this.reducedMotion ? 0.16 : mode === 'ko' ? 0.72 : 0.32);
  }

  update({ fighterPositions, focusTarget, emphasisTarget, dt }: CameraInput) {
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

    // Keep a stable broadcast angle. The old sinusoidal orbit made the scene harder to read
    // and amplified perceived fighter rotation. Distance changes, angle does not.
    const overviewDistance = 17.2 + Math.min(5.2, spread * 0.52);
    const distance = this.mode === 'ko' && !this.reducedMotion
      ? 12.2
      : this.mode === 'combat' && !this.reducedMotion
        ? 13.4
        : this.mode === 'focus'
          ? 11.8
          : overviewDistance;
    const height = this.mode === 'ko' && !this.reducedMotion
      ? 7.8
      : this.mode === 'combat' && !this.reducedMotion
        ? 8.4
        : this.mode === 'focus'
          ? 7.8
          : 10.8 + Math.min(1.8, spread * 0.13);

    const angle = 0.72;
    const follow = this.mode === 'overview' ? 0.26 : 0.46;
    this.desired.set(
      target.x * follow + Math.cos(angle) * distance,
      height,
      target.z * follow + Math.sin(angle) * distance,
    );

    const positionLerp = 1 - Math.pow(this.reducedMotion ? 0.1 : this.mode === 'ko' ? 0.02 : 0.04, dt);
    this.camera.position.lerp(this.desired, positionLerp);
    const lookY = this.mode === 'ko' ? 1.6 : this.mode === 'combat' || this.mode === 'focus' ? 1.4 : 1.18;
    this.lookAt.lerp(new THREE.Vector3(target.x * 0.62, lookY, target.z * 0.62), 1 - Math.pow(this.reducedMotion ? 0.1 : 0.04, dt));

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.22;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.012, dt);
    }

    this.camera.lookAt(this.lookAt);
  }
}
