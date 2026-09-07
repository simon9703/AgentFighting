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

type Trail = {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
};

/**
 * Presentation-only particle system. It consumes renderer events and never
 * mutates authoritative match state.
 */
export class ArenaFx {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];
  private readonly trails: Trail[] = [];
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
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width * 0.3, length, 6), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    this.group.add(mesh);
    this.trails.push({ mesh, life, maxLife: life });
  }

  ring(position: THREE.Vector3, color: THREE.ColorRepresentation, radius = 0.4, life = 0.35) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius * 0.65, radius, 32), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = Math.max(mesh.position.y, 0.08);
    this.group.add(mesh);
    this.trails.push({ mesh, life, maxLife: life });
  }

  update(dt: number) {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= dt;
      particle.velocity.y -= 7.5 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      const ratio = Math.max(0, particle.life / particle.maxLife);
      particle.mesh.scale.multiplyScalar(0.985);
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = ratio;
      if (particle.life <= 0) {
        this.group.remove(particle.mesh);
        material.dispose();
        this.particles.splice(index, 1);
      }
    }

    for (let index = this.trails.length - 1; index >= 0; index -= 1) {
      const trail = this.trails[index];
      trail.life -= dt;
      const ratio = Math.max(0, trail.life / trail.maxLife);
      const material = trail.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = ratio * 0.8;
      trail.mesh.scale.x = 1 + (1 - ratio) * 0.8;
      trail.mesh.scale.z = 1 + (1 - ratio) * 0.8;
      if (trail.life <= 0) {
        this.group.remove(trail.mesh);
        trail.mesh.geometry.dispose();
        material.dispose();
        this.trails.splice(index, 1);
      }
    }
  }

  dispose() {
    this.particles.forEach(({ mesh }) => {
      (mesh.material as THREE.Material).dispose();
      this.group.remove(mesh);
    });
    this.trails.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.group.remove(mesh);
    });
    this.particles.length = 0;
    this.trails.length = 0;
    this.particleGeometry.dispose();
  }
}
