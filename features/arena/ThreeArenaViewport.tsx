'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ArenaViewModel } from '@/features/renderers/types';
import { ArenaFx } from './ArenaFx';
import { ArenaPostFX } from './ArenaPostFX';
import { CameraDirector } from './CameraDirector';

type Props = {
  view: ArenaViewModel;
  selectedFighterId?: string;
  quality?: 'low' | 'high';
};

type FighterVisual = {
  root: THREE.Group;
  body: THREE.Mesh;
  glow: THREE.Mesh;
  intentRing: THREE.Mesh;
  directionLine: THREE.Line;
  target: THREE.Vector3;
  velocity: THREE.Vector3;
  lastPosition: THREE.Vector3;
  color: THREE.Color;
  lastIntent: string;
};

type WeaponVisual = { root: THREE.Group; halo: THREE.Mesh };

const ARENA_SCALE = 0.86;

function makeRobot(colorValue: string) {
  const color = new THREE.Color(colorValue);
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x11141b, roughness: 0.5, metalness: 0.5 });
  const emissive = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 6, 12), material);
  body.position.y = 0.85;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.38, 0.52), dark);
  head.position.y = 1.55;
  head.castShadow = true;
  root.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.03), emissive);
  visor.position.set(0, 1.58, 0.275);
  root.add(visor);

  const shoulderGeo = new THREE.SphereGeometry(0.18, 10, 8);
  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(shoulderGeo, material);
    shoulder.position.set(side * 0.48, 1.15, 0);
    shoulder.castShadow = true;
    root.add(shoulder);
  });

  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.82, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  root.add(glow);

  const intentRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.028, 8, 48, Math.PI * 1.35),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }),
  );
  intentRing.rotation.x = Math.PI / 2;
  intentRing.position.y = 2.15;
  root.add(intentRing);

  const directionGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.08, 0),
    new THREE.Vector3(0, 0.08, 1.7),
  ]);
  const directionMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.32 });
  const directionLine = new THREE.Line(directionGeometry, directionMaterial);
  root.add(directionLine);

  return { root, body, glow, intentRing, directionLine, color };
}

function makeWeapon(type: string) {
  const root = new THREE.Group();
  const color = type === 'bomb' ? 0xff6a6a : type === 'shield' ? 0x6ae4ff : type === 'hammer' ? 0xffd46a : 0xc68cff;
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85, roughness: 0.3, metalness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.55, metalness: 0.5 });

  if (type === 'hammer') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), dark);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.26), material);
    head.position.y = 0.46;
    root.add(handle, head);
  } else if (type === 'shield') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 24), material);
    shield.rotation.x = Math.PI / 2;
    root.add(shield);
  } else if (type === 'bomb') {
    root.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), material));
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), material);
    fuse.position.y = 0.34;
    fuse.rotation.z = 0.45;
    root.add(fuse);
  } else {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.7, 10), material);
    barrel.rotation.z = Math.PI / 2;
    root.add(barrel);
  }

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.62, 30),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.4;
  root.add(halo);
  return { root, halo };
}

function eventColor(type: string) {
  if (type === 'eliminated' || type === 'stock-lost') return 0xff625f;
  if (type === 'weapon-use' || type === 'weapon-pickup') return 0xffd66b;
  if (type === 'chaos') return 0xb67cff;
  return 0x8af4ff;
}

export default function ThreeArenaViewport({ view, selectedFighterId, quality = 'high' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const selectedRef = useRef(selectedFighterId);
  viewRef.current = view;
  selectedRef.current = selectedFighterId;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060b);
    scene.fog = new THREE.FogExp2(0x07101b, 0.032);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(14, 15, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.8 : 1.2));
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x79c8ff, 0x090b10, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(-8, 18, 10);
    key.castShadow = quality === 'high';
    key.shadow.mapSize.set(quality === 'high' ? 2048 : 512, quality === 'high' ? 2048 : 512);
    scene.add(key);
    const rim = new THREE.PointLight(0x7c4dff, 65, 35, 2);
    rim.position.set(0, 7, -5);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(9.8, 10.2, 0.72, 64),
      new THREE.MeshStandardMaterial({ color: 0x111722, roughness: 0.84, metalness: 0.32 }),
    );
    floor.receiveShadow = quality === 'high';
    floor.position.y = -0.42;
    world.add(floor);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x56e1ff, transparent: true, opacity: 0.48, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(8.85, 9.25, 72), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    world.add(ring);

    const grid = new THREE.GridHelper(18, 18, 0x294258, 0x182431);
    grid.position.y = 0.015;
    world.add(grid);

    const centerPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.45, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0x151d2a, roughness: 0.52, metalness: 0.72 }),
    );
    centerPlatform.position.y = 0.02;
    centerPlatform.receiveShadow = true;
    world.add(centerPlatform);

    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2431, roughness: 0.5, metalness: 0.65 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x53d8ff, emissive: 0x176a8a, emissiveIntensity: 0.75 });
    [
      [-4.6, -2.6, 1.25, 1.05, 2.8], [4.4, 2.8, 1.1, 1.35, 2.6],
      [-3.6, 3.7, 2.4, 0.8, 0.9], [3.2, -3.8, 2.2, 0.8, 0.9],
    ].forEach(([x, z, sx, sy, sz], index) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), coverMaterial);
      block.position.set(x, sy / 2, z);
      block.rotation.y = index % 2 ? -0.24 : 0.24;
      block.castShadow = quality === 'high';
      block.receiveShadow = quality === 'high';
      world.add(block);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.72, 0.05, sz * 1.02), accentMaterial);
      strip.position.set(x, sy + 0.03, z);
      strip.rotation.y = block.rotation.y;
      world.add(strip);
    });

    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x934dff, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 10), beaconMat);
      beacon.position.set(Math.cos(angle) * 9.45, 1.2, Math.sin(angle) * 9.45);
      world.add(beacon);
    }

    const fighterVisuals = new Map<string, FighterVisual>();
    const weaponVisuals = new Map<string, WeaponVisual>();
    const fx = new ArenaFx();
    scene.add(fx.group);
    const post = new ArenaPostFX(renderer, scene, camera, quality === 'high');
    const cameraDirector = new CameraDirector(camera);
    let lastEventId = -1;
    let emphasisTarget: THREE.Vector3 | undefined;

    const worldPosition = (x: number, z: number, radius: number, y = 0) => {
      const scale = radius > 0 ? 8.25 / radius : 1;
      return new THREE.Vector3(x * scale * ARENA_SCALE, y, z * scale * ARENA_SCALE);
    };

    const syncFighters = () => {
      const current = viewRef.current;
      const active = new Set(current.fighters.map((fighter) => fighter.id));
      current.fighters.forEach((fighter) => {
        let visual = fighterVisuals.get(fighter.id);
        if (!visual) {
          const robot = makeRobot(fighter.color);
          world.add(robot.root);
          visual = {
            root: robot.root,
            body: robot.body,
            glow: robot.glow,
            intentRing: robot.intentRing,
            directionLine: robot.directionLine,
            target: new THREE.Vector3(),
            velocity: new THREE.Vector3(),
            lastPosition: new THREE.Vector3(),
            color: robot.color,
            lastIntent: '',
          };
          fighterVisuals.set(fighter.id, visual);
        }

        visual.target.copy(worldPosition(fighter.x, fighter.z, current.radius));
        visual.velocity.set(fighter.velocityX, 0, fighter.velocityZ);
        visual.root.visible = !fighter.eliminated;
        visual.root.scale.setScalar(fighter.respawning ? 0.72 : 1);
        visual.body.rotation.z = Math.min(0.18, visual.velocity.length() * 0.015);
        visual.intentRing.visible = Boolean(fighter.intent) || selectedRef.current === fighter.id;
        (visual.intentRing.material as THREE.MeshBasicMaterial).opacity = selectedRef.current === fighter.id
          ? 0.95
          : fighter.intent.toLowerCase().includes('attack') ? 0.86 : 0.38;
        (visual.directionLine.material as THREE.LineBasicMaterial).opacity = selectedRef.current === fighter.id ? 0.8 : 0.24;

        if (visual.velocity.lengthSq() > 0.01) visual.root.rotation.y = Math.atan2(visual.velocity.x, visual.velocity.z);

        if (fighter.intent !== visual.lastIntent) {
          const intent = fighter.intent.toLowerCase();
          const position = visual.target.clone();
          const facing = visual.root.rotation.y;
          if (intent.includes('heavy')) fx.slash(position, facing, fighter.color, true);
          else if (intent.includes('attack')) fx.slash(position, facing, fighter.color, false);
          if (intent.includes('dodge') && visual.velocity.lengthSq() > 0.01) fx.dodge(position, visual.velocity, fighter.color);
          if (intent.includes('shield') || fighter.weapon === 'shield') fx.shield(position, fighter.color, 0.42);
          visual.lastIntent = fighter.intent;
        }
      });

      fighterVisuals.forEach((visual, id) => {
        if (!active.has(id)) {
          world.remove(visual.root);
          fighterVisuals.delete(id);
        }
      });
    };

    const syncWeapons = () => {
      const current = viewRef.current;
      const active = new Set<string>();
      current.weapons.forEach((weapon) => {
        active.add(weapon.id);
        let visual = weaponVisuals.get(weapon.id);
        if (!visual) {
          visual = makeWeapon(weapon.type);
          world.add(visual.root);
          weaponVisuals.set(weapon.id, visual);
        }
        visual.root.visible = weapon.available;
        visual.root.position.copy(worldPosition(weapon.x, weapon.z, current.radius, 0.72));
      });
      weaponVisuals.forEach((visual, id) => {
        if (!active.has(id)) {
          world.remove(visual.root);
          weaponVisuals.delete(id);
        }
      });
    };

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      post.resize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const current = viewRef.current;
      syncFighters();
      syncWeapons();

      fighterVisuals.forEach((visual) => {
        visual.lastPosition.copy(visual.root.position);
        visual.root.position.lerp(visual.target, 1 - Math.pow(0.001, dt));
        visual.glow.rotation.z += dt * 1.8;
        visual.intentRing.rotation.z -= dt * 1.25;
        const moved = visual.root.position.distanceTo(visual.lastPosition);
        if (moved > 0.08 && visual.velocity.length() > 2.4 && Math.random() < (quality === 'high' ? 0.32 : 0.12)) {
          fx.trail(visual.lastPosition.clone().setY(0.18), visual.root.position.clone().setY(0.18), visual.color, 0.045, 0.16);
        }
      });

      weaponVisuals.forEach((visual) => {
        visual.root.rotation.y += dt * 1.2;
        visual.root.position.y = 0.7 + Math.sin(performance.now() * 0.003 + visual.root.position.x) * 0.12;
        visual.halo.rotation.z += dt * 0.9;
      });

      const newest = current.events[current.events.length - 1];
      if (newest && newest.id !== lastEventId) {
        lastEventId = newest.id;
        const actor = current.fighters.find((fighter) => fighter.id === newest.actor);
        const target = current.fighters.find((fighter) => fighter.id === newest.target);
        const subject = target ?? actor;
        const color = eventColor(newest.type);

        if (subject) {
          const position = worldPosition(subject.x, subject.z, current.radius, 0.35);
          emphasisTarget = position.clone();
          if (['hit', 'weapon-use', 'stock-lost', 'eliminated', 'weapon-pickup', 'chaos'].includes(newest.type)) {
            fx.ring(position, color, newest.type === 'eliminated' ? 0.9 : 0.48, newest.type === 'eliminated' ? 0.7 : 0.34);
            fx.burst({
              position: position.clone().setY(newest.type === 'eliminated' ? 1.1 : 0.7),
              color,
              count: newest.type === 'eliminated' ? 46 : newest.type === 'stock-lost' ? 30 : 18,
              speed: newest.type === 'eliminated' ? 7 : 4.5,
              life: newest.type === 'eliminated' ? 0.85 : 0.5,
              size: newest.type === 'eliminated' ? 1.3 : 1,
            });
          }
        }

        if (actor && target) {
          const from = worldPosition(actor.x, actor.z, current.radius);
          const to = worldPosition(target.x, target.z, current.radius);
          fx.targetLink(from, to, actor.color, newest.type === 'weapon-use' ? 0.42 : 0.26);
          if (newest.type === 'weapon-use') fx.beam(from, to, 0xffd66b, 0.22);
        }

        if (newest.type === 'hit') {
          cameraDirector.impact(0.17, 'combat');
          post.hit(0.24);
        } else if (newest.type === 'stock-lost') {
          cameraDirector.impact(0.38, 'ko');
          post.hit(0.5);
        } else if (newest.type === 'eliminated') {
          cameraDirector.impact(0.52, 'ko');
          post.hit(0.72);
        } else if (newest.type === 'weapon-use') {
          cameraDirector.impact(0.12, 'combat');
          post.hit(newest.detail.toLowerCase().includes('bomb') ? 0.46 : 0.18);
        }
      }

      fx.update(dt);
      post.setChaos(current.chaos !== 'none');
      post.update(dt);

      const visible = [...fighterVisuals.entries()].filter(([, visual]) => visual.root.visible);
      const selected = selectedRef.current ? fighterVisuals.get(selectedRef.current)?.root.position.clone() : undefined;
      if (selectedRef.current && selected) cameraDirector.setMode('focus', 0.1);
      cameraDirector.update({
        fighterPositions: visible.map(([, visual]) => visual.root.position),
        focusTarget: selected,
        emphasisTarget,
        dt,
        time: performance.now() * 0.001,
      });

      const danger = current.chaos !== 'none';
      ringMaterial.opacity = danger ? 0.86 : 0.48 + Math.sin(performance.now() * 0.003) * 0.08;
      ringMaterial.color.setHex(danger ? 0xb86cff : 0x56e1ff);
      rim.color.setHex(danger ? 0xc85cff : 0x7c4dff);
      rim.intensity = danger ? 95 : 65;
      renderer.toneMappingExposure = danger ? 1.22 : 1.16;
      post.render();
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      fx.dispose();
      post.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material?.dispose());
        }
      });
    };
  }, [quality]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} aria-label="Three dimensional autonomous agent arena" />;
}
