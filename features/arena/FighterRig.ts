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

function limb(material: THREE.Material, x: number, y: number, length: number, radius: number) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 8), material);
  mesh.position.y = -length * 0.45;
  mesh.castShadow = true;
  pivot.add(mesh);
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
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.15, roughness: 0.25, metalness: 0.78 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.48, metalness: 0.64 });

  if (type === 'hammer') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.68, 8), dark);
    handle.position.y = -0.16;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.2), material);
    head.position.y = 0.2;
    root.add(handle, head);
    root.rotation.z = -0.3;
  } else if (type === 'shield') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 24), material);
    shield.rotation.x = Math.PI / 2;
    root.add(shield);
    root.position.set(-0.22, 0.02, 0.38);
    root.rotation.y = -0.2;
  } else if (type === 'bomb') {
    root.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), material));
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), material);
    fuse.position.y = 0.23;
    fuse.rotation.z = 0.5;
    root.add(fuse);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.58), dark);
    body.position.z = 0.18;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.52, 10), material);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.48;
    root.add(body, barrel);
    root.rotation.x = -0.12;
  }
  return root;
}

export function createFighterRig(colorValue: string): FighterRig {
  const color = new THREE.Color(colorValue);
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.24, metalness: 0.78 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 0.42, metalness: 0.72 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x2b3442, roughness: 0.34, metalness: 0.82 });
  const emissive = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.9 });

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.44), dark);
  pelvis.position.y = 0.72;
  root.add(pelvis);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.84, 0.58), material);
  body.position.y = 1.2;
  body.castShadow = true;
  root.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.06), emissive);
  chest.position.set(0, 1.26, 0.32);
  root.add(chest);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.58), dark);
  head.position.y = 1.82;
  head.castShadow = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.13, 0.035), emissive);
  visor.position.set(0, 1.84, 0.31);
  root.add(visor);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.24), trim);
  backpack.position.set(0, 1.25, -0.4);
  root.add(backpack);

  const leftArm = limb(dark, -0.62, 1.48, 0.5, 0.12);
  const rightArm = limb(dark, 0.62, 1.48, 0.5, 0.12);
  const leftLeg = limb(trim, -0.22, 0.69, 0.56, 0.14);
  const rightLeg = limb(trim, 0.22, 0.69, 0.56, 0.14);
  leftArm.rotation.z = -0.12;
  rightArm.rotation.z = 0.12;
  root.add(leftArm, rightArm, leftLeg, rightLeg);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.62, 0.98, 0.1);
  root.add(weaponMount);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), material);
    shoulder.position.set(side * 0.58, 1.48, 0);
    shoulder.castShadow = true;
    root.add(shoulder);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.48), dark);
    foot.position.set(side * 0.22, 0.06, 0.08);
    root.add(foot);
  }

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.9, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.64, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.025;
  root.add(glow);

  const intentRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.032, 8, 48, Math.PI * 1.35),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 }),
  );
  intentRing.rotation.x = Math.PI / 2;
  intentRing.position.y = 2.28;
  root.add(intentRing);

  const directionGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(0, 0.08, 2.0),
  ]);
  const directionLine = new THREE.Line(
    directionGeometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }),
  );
  root.add(directionLine);

  const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
  label.position.set(0, 3.0, 0);
  label.scale.set(3.25, 1.0, 1);
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
    weapon.position.x -= 0.72;
    weapon.position.y += 0.28;
  } else {
    weapon.position.set(0.02, -0.18, 0.22);
  }
  rig.weaponMount.add(weapon);
}

export function triggerFighterRig(rig: FighterRig, type: keyof FighterRigReaction, amount = 1) {
  rig.reaction[type] = Math.max(rig.reaction[type], amount);
}

export function updateFighterRig(rig: FighterRig, frame: FighterRigFrame) {
  const motionScale = frame.reducedMotion ? 0.35 : 1;
  const stride = Math.min(1, frame.speed / 5) * motionScale;
  const walk = Math.sin(frame.time * (5.8 + frame.speed * 0.35) + rig.phase);
  const intent = frame.intent.toLowerCase();

  if (intent.includes('heavy')) rig.reaction.heavy = Math.max(rig.reaction.heavy, 0.72);
  else if (intent.includes('attack')) rig.reaction.attack = Math.max(rig.reaction.attack, 0.62);
  if (intent.includes('dodge')) rig.reaction.dodge = Math.max(rig.reaction.dodge, 0.7);
  if (frame.respawning) rig.reaction.respawn = Math.max(rig.reaction.respawn, 0.8);

  const attack = rig.reaction.attack;
  const heavy = rig.reaction.heavy;
  const dodge = rig.reaction.dodge;
  const hit = rig.reaction.hit;
  const ko = rig.reaction.ko;
  const respawn = rig.reaction.respawn;

  const legSwing = walk * 0.58 * stride;
  const armSwing = -walk * 0.46 * stride;
  rig.leftLeg.rotation.x = damp(rig.leftLeg.rotation.x, legSwing, 16, frame.dt);
  rig.rightLeg.rotation.x = damp(rig.rightLeg.rotation.x, -legSwing, 16, frame.dt);
  rig.leftArm.rotation.x = damp(rig.leftArm.rotation.x, armSwing + heavy * 0.45, 18, frame.dt);
  rig.rightArm.rotation.x = damp(rig.rightArm.rotation.x, -armSwing - attack * 1.35 - heavy * 1.8, 20, frame.dt);
  rig.rightArm.rotation.z = damp(rig.rightArm.rotation.z, 0.12 - heavy * 0.45, 18, frame.dt);

  const forwardLean = stride * 0.12 + dodge * 0.32 - hit * 0.22;
  rig.body.rotation.x = damp(rig.body.rotation.x, forwardLean, 14, frame.dt);
  rig.body.rotation.z = damp(rig.body.rotation.z, hit * 0.3 - dodge * 0.18, 16, frame.dt);
  rig.head.rotation.x = damp(rig.head.rotation.x, -forwardLean * 0.34, 12, frame.dt);
  rig.head.rotation.z = damp(rig.head.rotation.z, -hit * 0.2, 14, frame.dt);
  rig.weaponMount.rotation.x = damp(rig.weaponMount.rotation.x, -attack * 0.65 - heavy * 1.05, 18, frame.dt);
  rig.weaponMount.rotation.z = damp(rig.weaponMount.rotation.z, heavy * -0.28, 18, frame.dt);

  const bob = Math.abs(walk) * 0.055 * stride;
  rig.body.position.y = 1.2 - bob + respawn * 0.12;
  rig.head.position.y = 1.82 - bob * 0.5 + respawn * 0.08;

  if (ko > 0.01) {
    rig.root.rotation.z = damp(rig.root.rotation.z, -0.8 * ko, 9, frame.dt);
    rig.root.rotation.x = damp(rig.root.rotation.x, 0.45 * ko, 9, frame.dt);
  } else {
    rig.root.rotation.z = damp(rig.root.rotation.z, 0, 12, frame.dt);
    rig.root.rotation.x = damp(rig.root.rotation.x, 0, 12, frame.dt);
  }

  const pulse = 1 + Math.sin(frame.time * 12 + rig.phase) * 0.045 * (frame.selected ? 1 : 0.35);
  rig.glow.scale.setScalar(pulse + hit * 0.12 + respawn * 0.16);
  (rig.glow.material as THREE.MeshBasicMaterial).opacity = frame.eliminated ? 0 : 0.48 + (frame.selected ? 0.28 : 0) + respawn * 0.18;

  const decay = frame.reducedMotion ? 5.5 : 3.6;
  (Object.keys(rig.reaction) as (keyof FighterRigReaction)[]).forEach((key) => {
    rig.reaction[key] = Math.max(0, rig.reaction[key] - frame.dt * decay);
  });
}
