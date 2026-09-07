import * as THREE from 'three';

export type FighterRigReaction = {
  attack: number;
  heavy: number;
  dodge: number;
  hit: number;
  ko: number;
  respawn: number;
};

export type FighterRig = {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponMount: THREE.Group;
  glow: THREE.Mesh;
  intentRing: THREE.Mesh;
  directionLine: THREE.Line;
  label: THREE.Sprite;
  color: THREE.Color;
  reaction: FighterRigReaction;
  phase: number;
  facing: number;
  weaponType?: string;
};

export type FighterRigFrame = {
  dt: number;
  time: number;
  speed: number;
  intent: string;
  selected: boolean;
  respawning: boolean;
  eliminated: boolean;
  reducedMotion: boolean;
};

const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

const dampAngle = (current: number, target: number, lambda: number, dt: number) => {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * dt));
};

function armorMaterial(color: THREE.Color) {
  return new THREE.MeshStandardMaterial({
    color: color.clone().lerp(new THREE.Color(0xffffff), 0.18),
    emissive: color.clone().multiplyScalar(0.22),
    emissiveIntensity: 0.72,
    roughness: 0.34,
    metalness: 0.58,
  });
}

function limb(material: THREE.Material, x: number, y: number, length: number, radius: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);

  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length * 0.48, 6, 10), material);
  upper.position.y = -length * 0.26;
  upper.castShadow = true;
  pivot.add(upper);

  const joint = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.08, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x252d3a, roughness: 0.5, metalness: 0.56 }),
  );
  joint.position.y = -length * 0.56;
  joint.castShadow = true;
  pivot.add(joint);

  const lower = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.9, length * 0.38, 6, 10), material);
  lower.position.y = -length * 0.78;
  lower.castShadow = true;
  pivot.add(lower);

  return pivot;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function heldWeapon(type: string) {
  const root = new THREE.Group();
  const color = type === 'bomb' ? 0xff6a6a : type === 'shield' ? 0x6ae4ff : type === 'hammer' ? 0xffd46a : 0xc68cff;
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.45, roughness: 0.24, metalness: 0.68 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252a34, roughness: 0.42, metalness: 0.62 });

  if (type === 'hammer') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.78, 8), dark);
    handle.position.y = -0.18;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.24), material);
    head.position.y = 0.25;
    root.add(handle, head);
    root.rotation.z = -0.28;
  } else if (type === 'shield') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 28), material);
    shield.rotation.x = Math.PI / 2;
    root.add(shield);
    root.position.set(-0.24, 0.04, 0.42);
  } else if (type === 'bomb') {
    root.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), material));
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 6), material);
    fuse.position.y = 0.25;
    fuse.rotation.z = 0.5;
    root.add(fuse);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.62), dark);
    body.position.z = 0.2;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.58, 10), material);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.52;
    root.add(body, barrel);
  }
  return root;
}

export function createFighterRig(colorValue: string): FighterRig {
  const color = new THREE.Color(colorValue);
  const root = new THREE.Group();
  const material = armorMaterial(color);
  const secondary = new THREE.MeshStandardMaterial({ color: 0x303a49, roughness: 0.42, metalness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171c24, roughness: 0.5, metalness: 0.52 });
  const emissive = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.25, roughness: 0.2, metalness: 0.35 });

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.48), secondary);
  pelvis.position.y = 0.78;
  pelvis.castShadow = true;
  root.add(pelvis);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.92, 0.66), material);
  body.position.y = 1.34;
  body.castShadow = true;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.25, 0.08), emissive);
  chest.position.set(0, 1.39, 0.37);
  root.add(chest);

  const chestCore = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), emissive);
  chestCore.position.set(0, 1.38, 0.416);
  root.add(chestCore);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.2, 12), secondary);
  neck.position.y = 1.9;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.5, 0.64), material);
  head.position.y = 2.14;
  head.castShadow = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.15, 0.045), emissive);
  visor.position.set(0, 2.16, 0.345);
  root.add(visor);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.42), secondary);
  crest.position.set(0, 2.46, -0.03);
  root.add(crest);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.68, 0.28), dark);
  backpack.position.set(0, 1.36, -0.47);
  backpack.castShadow = true;
  root.add(backpack);

  const leftArm = limb(material, -0.72, 1.66, 0.7, 0.14);
  const rightArm = limb(material, 0.72, 1.66, 0.7, 0.14);
  const leftLeg = limb(secondary, -0.26, 0.82, 0.72, 0.17);
  const rightLeg = limb(secondary, 0.26, 0.82, 0.72, 0.17);
  leftArm.rotation.z = -0.08;
  rightArm.rotation.z = 0.08;
  root.add(leftArm, rightArm, leftLeg, rightLeg);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), material);
    shoulder.scale.set(1.25, 0.82, 1.05);
    shoulder.position.set(side * 0.68, 1.67, 0);
    shoulder.castShadow = true;
    root.add(shoulder);

    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.3), dark);
    fist.position.set(side * 0.72, 0.88, 0.06);
    root.add(fist);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.58), dark);
    foot.position.set(side * 0.26, 0.08, 0.12);
    foot.castShadow = true;
    root.add(foot);
  }

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.72, 1.08, 0.14);
  root.add(weaponMount);

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1.08, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.76, side: THREE.DoubleSide, depthWrite: false }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.028;
  root.add(glow);

  const intentRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.16, 0.045, 10, 54, Math.PI * 1.35),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.58, depthWrite: false }),
  );
  intentRing.rotation.x = Math.PI / 2;
  intentRing.position.y = 2.78;
  root.add(intentRing);

  const directionGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.09, 0),
    new THREE.Vector3(0, 0.09, 2.2),
  ]);
  const directionLine = new THREE.Line(
    directionGeometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.24 }),
  );
  root.add(directionLine);

  const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
  label.position.set(0, 3.55, 0);
  label.scale.set(3.6, 1.12, 1);
  label.renderOrder = 20;
  root.add(label);

  return {
    root,
    body,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponMount,
    glow,
    intentRing,
    directionLine,
    label,
    color,
    reaction: { attack: 0, heavy: 0, dodge: 0, hit: 0, ko: 0, respawn: 0 },
    phase: Math.random() * Math.PI * 2,
    facing: 0,
  };
}

export function setFighterRigWeapon(rig: FighterRig, type?: string) {
  if (rig.weaponType === type) return;
  rig.weaponMount.children.forEach((child) => disposeObject(child));
  rig.weaponMount.clear();
  rig.weaponType = type;
  if (!type) return;

  const weapon = heldWeapon(type);
  if (type === 'shield') {
    weapon.position.x -= 0.8;
    weapon.position.y += 0.34;
  } else {
    weapon.position.set(0.02, -0.16, 0.28);
  }
  rig.weaponMount.add(weapon);
}

export function triggerFighterRig(rig: FighterRig, type: keyof FighterRigReaction, amount = 1) {
  rig.reaction[type] = Math.max(rig.reaction[type], amount);
}

export function updateFighterRig(rig: FighterRig, frame: FighterRigFrame) {
  const motionScale = frame.reducedMotion ? 0.45 : 1;
  const moving = frame.speed > 0.18;
  const stride = moving ? Math.min(1, frame.speed / 3.2) * motionScale : 0;
  const walk = Math.sin(frame.time * (7.2 + Math.min(frame.speed, 5) * 0.55) + rig.phase);

  // ThreeArenaViewport writes a requested facing from simulation velocity. Smooth it here
  // so tiny steering corrections do not make the whole fighter jitter left/right.
  const requestedFacing = rig.root.rotation.y;
  if (moving) rig.facing = dampAngle(rig.facing, requestedFacing, 9.5, frame.dt);
  rig.root.rotation.y = rig.facing;

  if (frame.respawning) rig.reaction.respawn = Math.max(rig.reaction.respawn, 0.8);

  const attack = rig.reaction.attack;
  const heavy = rig.reaction.heavy;
  const dodge = rig.reaction.dodge;
  const hit = rig.reaction.hit;
  const ko = rig.reaction.ko;
  const respawn = rig.reaction.respawn;

  // Reaction values decay 1 -> 0. Convert that into a real wind-up / strike / recovery arc.
  const attackArc = Math.sin((1 - attack) * Math.PI) * (attack > 0 ? 1 : 0);
  const heavyArc = Math.sin((1 - heavy) * Math.PI) * (heavy > 0 ? 1 : 0);
  const strike = Math.max(attackArc, heavyArc);

  const legSwing = walk * 0.72 * stride;
  const armSwing = -walk * 0.52 * stride;
  rig.leftLeg.rotation.x = damp(rig.leftLeg.rotation.x, legSwing, 17, frame.dt);
  rig.rightLeg.rotation.x = damp(rig.rightLeg.rotation.x, -legSwing, 17, frame.dt);
  rig.leftLeg.rotation.z = damp(rig.leftLeg.rotation.z, -0.035 * stride, 12, frame.dt);
  rig.rightLeg.rotation.z = damp(rig.rightLeg.rotation.z, 0.035 * stride, 12, frame.dt);

  rig.leftArm.rotation.x = damp(rig.leftArm.rotation.x, armSwing + heavyArc * 0.65, 18, frame.dt);
  rig.rightArm.rotation.x = damp(rig.rightArm.rotation.x, -armSwing - attackArc * 1.75 - heavyArc * 2.15, 22, frame.dt);
  rig.rightArm.rotation.z = damp(rig.rightArm.rotation.z, 0.08 - heavyArc * 0.6 - attackArc * 0.18, 18, frame.dt);
  rig.rightArm.rotation.y = damp(rig.rightArm.rotation.y, -strike * 0.22, 18, frame.dt);

  const forwardLean = stride * 0.14 + dodge * 0.25 + strike * 0.12 - hit * 0.18;
  rig.body.rotation.x = damp(rig.body.rotation.x, forwardLean, 14, frame.dt);
  rig.body.rotation.z = damp(rig.body.rotation.z, hit * 0.22 - dodge * 0.13 - heavyArc * 0.08, 15, frame.dt);
  rig.head.rotation.x = damp(rig.head.rotation.x, -forwardLean * 0.28, 12, frame.dt);
  rig.head.rotation.z = damp(rig.head.rotation.z, -hit * 0.16, 14, frame.dt);
  rig.weaponMount.rotation.x = damp(rig.weaponMount.rotation.x, -attackArc * 0.82 - heavyArc * 1.28, 20, frame.dt);
  rig.weaponMount.rotation.z = damp(rig.weaponMount.rotation.z, heavyArc * -0.38, 18, frame.dt);

  const bob = Math.abs(walk) * 0.09 * stride;
  rig.body.position.y = 1.34 - bob + respawn * 0.1;
  rig.head.position.y = 2.14 - bob * 0.55 + respawn * 0.06;

  if (ko > 0.01) {
    rig.root.rotation.z = damp(rig.root.rotation.z, -0.72 * ko, 9, frame.dt);
    rig.root.rotation.x = damp(rig.root.rotation.x, 0.38 * ko, 9, frame.dt);
  } else {
    rig.root.rotation.z = damp(rig.root.rotation.z, 0, 12, frame.dt);
    rig.root.rotation.x = damp(rig.root.rotation.x, 0, 12, frame.dt);
  }

  const pulse = 1 + Math.sin(frame.time * 7 + rig.phase) * 0.025 * (frame.selected ? 1 : 0.28);
  rig.glow.scale.setScalar(pulse + hit * 0.08 + respawn * 0.12 + strike * 0.04);
  (rig.glow.material as THREE.MeshBasicMaterial).opacity = frame.eliminated ? 0 : 0.62 + (frame.selected ? 0.24 : 0) + respawn * 0.1;

  const decayRates: Record<keyof FighterRigReaction, number> = {
    attack: frame.reducedMotion ? 6.5 : 3.4,
    heavy: frame.reducedMotion ? 5.2 : 2.25,
    dodge: frame.reducedMotion ? 6.5 : 4.2,
    hit: frame.reducedMotion ? 7.2 : 5.4,
    ko: frame.reducedMotion ? 3.8 : 1.7,
    respawn: frame.reducedMotion ? 4.2 : 2.2,
  };
  (Object.keys(rig.reaction) as (keyof FighterRigReaction)[]).forEach((key) => {
    rig.reaction[key] = Math.max(0, rig.reaction[key] - frame.dt * decayRates[key]);
  });
}
