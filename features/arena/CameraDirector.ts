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
  private readonly desired = new THREE.Vector3(13, 9.6, 17);

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly reducedMotion = false) {}

  setMode(mode: CameraMode, holdSeconds = 0.45) {
    this.mode = mode;
    this.hold = Math.max(this.hold, holdSeconds);
  }

  impact(amount: number, mode: CameraMode = 'combat') {
    this.shake = Math.max(this.shake, this.reducedMotion ? amount * 0.12 : amount);
    this.setMode(mode, this.reducedMotion ? 0.18 : mode === 'ko' ? 0.92 : 0.42);
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

    const orbit = this.reducedMotion ? 0.45 : 0.45 + Math.sin(time * 0.11) * 0.16;
    const overviewDistance = 14.6 + Math.min(4.4, spread * 0.46);
    const distance = this.mode === 'ko' && !this.reducedMotion
      ? 9.1
      : this.mode === 'combat' && !this.reducedMotion
        ? 10.7
        : this.mode === 'focus'
          ? 9.7
          : overviewDistance;
    const height = this.mode === 'ko' && !this.reducedMotion
      ? 6.2
      : this.mode === 'combat' && !this.reducedMotion
        ? 7.1
        : this.mode === 'focus'
          ? 6.9
          : 9.2 + Math.min(1.5, spread * 0.12);

    this.desired.set(
      target.x * 0.52 + Math.cos(orbit) * distance,
      height,
      target.z * 0.52 + Math.sin(orbit) * distance,
    );

    const positionLerp = 1 - Math.pow(this.reducedMotion ? 0.08 : this.mode === 'ko' ? 0.0025 : 0.018, dt);
    this.camera.position.lerp(this.desired, positionLerp);
    const lookY = this.mode === 'ko' ? 1.55 : this.mode === 'combat' || this.mode === 'focus' ? 1.25 : 1.05;
    this.lookAt.lerp(new THREE.Vector3(target.x * 0.72, lookY, target.z * 0.72), 1 - Math.pow(this.reducedMotion ? 0.08 : 0.012, dt));

    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.42;
      this.camera.position.z += (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.04, dt);
    }

    this.camera.lookAt(this.lookAt);
  }
}
