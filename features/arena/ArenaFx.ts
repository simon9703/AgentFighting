import * as THREE from 'three';

type BurstOptions = {
  position: THREE.Vector3;
  color: THREE.ColorRepresentation;
  count?: number;
  speed?: number;
  life?: number;
  size?: number;
};

type Particle = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
};

type Transient = {
  object: THREE.Object3D;
  life: number;
  maxLife: number;
  dispose: () => void;
  update?: (ratio: number) => void;
};

/** Presentation-only transient effects. No effect feeds back into the engine. */
export class ArenaFx {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];
  private readonly transients: Transient[] = [];
  private readonly particleGeometry = new THREE.IcosahedronGeometry(0.08, 0);

  burst({ position, color, count = 18, speed = 4.5, life = 0.5, size = 1 }: BurstOptions) {
    for (let index = 0; index < count; index += 1) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(this.particleGeometry, material);
      mesh.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      mesh.position.copy(position);
      this.group.add(mesh);
      const angle = Math.random() * Math.PI * 2;
      const vertical = 0.35 + Math.random() * 1.1;
      const magnitude = speed * (0.55 + Math.random() * 0.75);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * magnitude, vertical * magnitude * 0.55, Math.sin(angle) * magnitude),
        life,
        maxLife: life,
      });
    }
  }

  trail(from: THREE.Vector3, to: THREE.Vector3, color: THREE.ColorRepresentation, width = 0.055, life = 0.18) {
    const direction = to.clone().sub(from);
    const length = direction.length();
    if (length < 0.01) return;
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 });
    const geometry = new THREE.CylinderGeometry(width, width * 0.3, length, 6);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    this.group.add(mesh);
    this.addTransient(mesh, life, () => { geometry.dispose(); material.dispose(); }, (ratio) => {
      material.opacity = ratio * 0.75;
      mesh.scale.x = 1 + (1 - ratio) * 0.55;
      mesh.scale.z = 1 + (1 - ratio) * 0.55;
    });
  }

  ring(position: THREE.Vector3, color: THREE.ColorRepresentation, radius = 0.4, life = 0.35) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const geometry = new THREE.RingGeometry(radius * 0.65, radius, 32);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = Math.max(mesh.position.y, 0.08);
    this.group.add(mesh);
    this.addTransient(mesh, life, () => { geometry.dispose(); material.dispose(); }, (ratio) => {
      material.opacity = ratio * 0.85;
      mesh.scale.setScalar(1 + (1 - ratio) * 2.8);
    });
  }

  slash(position: THREE.Vector3, facing: number, color: THREE.ColorRepresentation, heavy = false) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
    const geometry = new THREE.TorusGeometry(heavy ? 1.2 : 0.9, heavy ? 0.09 : 0.055, 8, 40, Math.PI * 1.15);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position).setY(0.78);
    mesh.rotation.set(Math.PI / 2.3, facing, -0.4);
    this.group.add(mesh);
    this.addTransient(mesh, heavy ? 0.34 : 0.22, () => { geometry.dispose(); material.dispose(); }, (ratio) => {
      material.opacity = ratio;
      mesh.scale.setScalar(0.75 + (1 - ratio) * 0.7);
    });
  }

  beam(from: THREE.Vector3, to: THREE.Vector3, color: THREE.ColorRepresentation, life = 0.18) {
    this.trail(from.clone().setY(0.85), to.clone().setY(0.85), color, 0.085, life);
    this.ring(to.clone().setY(0.1), color, 0.24, life * 1.8);
  }

  shield(position: THREE.Vector3, color: THREE.ColorRepresentation, life = 0.38) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const geometry = new THREE.SphereGeometry(0.95, 20, 14);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position).setY(0.9);
    this.group.add(mesh);
    this.addTransient(mesh, life, () => { geometry.dispose(); material.dispose(); }, (ratio) => {
      material.opacity = ratio * 0.3;
      mesh.scale.setScalar(0.9 + (1 - ratio) * 0.24);
    });
  }

  dodge(position: THREE.Vector3, direction: THREE.Vector3, color: THREE.ColorRepresentation) {
    const end = position.clone().add(direction.clone().normalize().multiplyScalar(1.45));
    this.trail(position.clone().setY(0.35), end.setY(0.35), color, 0.13, 0.22);
    this.ring(position.clone().setY(0.08), color, 0.28, 0.2);
  }

  targetLink(from: THREE.Vector3, to: THREE.Vector3, color: THREE.ColorRepresentation, life = 0.28) {
    const points = [from.clone().setY(2.2), to.clone().setY(2.2)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0.65, dashSize: 0.22, gapSize: 0.14 });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.group.add(line);
    this.addTransient(line, life, () => { geometry.dispose(); material.dispose(); }, (ratio) => { material.opacity = ratio * 0.65; });
  }

  update(dt: number) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= dt;
      particle.velocity.y -= 7.5 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      const ratio = Math.max(0, particle.life / particle.maxLife);
      particle.mesh.scale.multiplyScalar(0.985);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
      if (particle.life <= 0) {
        this.group.remove(particle.mesh);
        (particle.mesh.material as THREE.Material).dispose();
        this.particles.splice(index, 1);
      }
    }

    for (let index = this.transients.length - 1; index >= 0; index -= 1) {
      const item = this.transients[index];
      item.life -= dt;
      const ratio = Math.max(0, item.life / item.maxLife);
      item.update?.(ratio);
      if (item.life <= 0) {
        this.group.remove(item.object);
        item.dispose();
        this.transients.splice(index, 1);
      }
    }
  }

  dispose() {
    this.particles.forEach(({ mesh }) => {
      (mesh.material as THREE.Material).dispose();
      this.group.remove(mesh);
    });
    this.transients.forEach((item) => {
      this.group.remove(item.object);
      item.dispose();
    });
    this.particles.length = 0;
    this.transients.length = 0;
    this.particleGeometry.dispose();
  }

  private addTransient(object: THREE.Object3D, life: number, dispose: () => void, update?: (ratio: number) => void) {
    this.transients.push({ object, life, maxLife: life, dispose, update });
  }
}
