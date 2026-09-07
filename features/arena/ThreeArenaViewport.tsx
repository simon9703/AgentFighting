'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ArenaViewModel } from '@/features/renderers/types';
import { ArenaFx } from './ArenaFx';
import { ArenaPostFX } from './ArenaPostFX';
import { CameraDirector } from './CameraDirector';

type Props = { view: ArenaViewModel; selectedFighterId?: string; quality?: 'low' | 'high' };

type FighterVisual = {
  root: THREE.Group;
  body: THREE.Mesh;
  glow: THREE.Mesh;
  intentRing: THREE.Mesh;
  directionLine: THREE.Line;
  label: THREE.Sprite;
  target: THREE.Vector3;
  velocity: THREE.Vector3;
  lastPosition: THREE.Vector3;
  color: THREE.Color;
  lastIntent: string;
  labelKey: string;
};

type WeaponVisual = { root: THREE.Group; halo: THREE.Mesh };

const ARENA_SCALE = 0.9;

function makeLabelTexture(title: string, damage: number, intent: string, color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(4,7,12,.82)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(12, 12, 488, 136, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#edf6ff';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(title.toUpperCase(), 34, 55);
  ctx.fillStyle = color;
  ctx.font = '900 42px system-ui, sans-serif';
  ctx.fillText(`${Math.round(damage)}%`, 34, 110);
  ctx.fillStyle = '#94a5bd';
  ctx.font = '700 20px ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.fillText((intent || 'OBSERVE').slice(0, 24).toUpperCase(), 476, 103);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function makeRobot(colorValue: string) {
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

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), material);
    shoulder.position.set(side * 0.58, 1.48, 0);
    shoulder.castShadow = true;
    root.add(shoulder);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 5, 8), dark);
    arm.position.set(side * 0.62, 1.05, 0.02);
    arm.rotation.z = side * 0.12;
    root.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.56, 5, 8), trim);
    leg.position.set(side * 0.22, 0.35, 0);
    root.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.48), dark);
    foot.position.set(side * 0.22, 0.06, 0.08);
    root.add(foot);
  });

  const glow = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.9, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.64, side: THREE.DoubleSide }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.025;
  root.add(glow);

  const intentRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.032, 8, 48, Math.PI * 1.35), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 }));
  intentRing.rotation.x = Math.PI / 2;
  intentRing.position.y = 2.28;
  root.add(intentRing);

  const directionGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.08, 2.0)]);
  const directionLine = new THREE.Line(directionGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 }));
  root.add(directionLine);

  const label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }));
  label.position.set(0, 3.0, 0);
  label.scale.set(3.25, 1.0, 1);
  label.renderOrder = 20;
  root.add(label);

  return { root, body, glow, intentRing, directionLine, label, color };
}

function makeWeapon(type: string) {
  const root = new THREE.Group();
  const color = type === 'bomb' ? 0xff6a6a : type === 'shield' ? 0x6ae4ff : type === 'hammer' ? 0xffd46a : 0xc68cff;
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.05, roughness: 0.26, metalness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151820, roughness: 0.5, metalness: 0.55 });
  if (type === 'hammer') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), dark);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.26), material);
    head.position.y = 0.46; root.add(handle, head);
  } else if (type === 'shield') {
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 24), material); shield.rotation.x = Math.PI / 2; root.add(shield);
  } else if (type === 'bomb') {
    root.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), material));
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), material); fuse.position.y = 0.34; fuse.rotation.z = 0.45; root.add(fuse);
  } else {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.7, 10), material); barrel.rotation.z = Math.PI / 2; root.add(barrel);
  }
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.62, 30), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -0.4; root.add(halo);
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
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03050a);
    scene.fog = new THREE.FogExp2(0x07101b, 0.025);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
    camera.position.set(13, 9.6, 17);

    const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.8 : 1.15));
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x78bfff, 0x080a0e, 1.45));
    const key = new THREE.DirectionalLight(0xffffff, 3.6);
    key.position.set(-7, 15, 9); key.castShadow = quality === 'high'; key.shadow.mapSize.set(quality === 'high' ? 2048 : 512, quality === 'high' ? 2048 : 512); scene.add(key);
    const rim = new THREE.PointLight(0x744cff, 78, 38, 2); rim.position.set(-2, 5.2, -7); scene.add(rim);
    const warm = new THREE.PointLight(0xff8a4d, 28, 24, 2); warm.position.set(8, 2.5, 4); scene.add(warm);

    const world = new THREE.Group(); scene.add(world);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(10.4, 10.8, 1.05, 64), new THREE.MeshStandardMaterial({ color: 0x0f1620, roughness: 0.78, metalness: 0.42 }));
    floor.receiveShadow = quality === 'high'; floor.position.y = -0.58; world.add(floor);

    const lowerDeck = new THREE.Mesh(new THREE.CylinderGeometry(11.7, 12.3, 0.55, 64), new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.65, metalness: 0.7 }));
    lowerDeck.position.y = -1.12; world.add(lowerDeck);

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x56e1ff, transparent: true, opacity: 0.52, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(8.95, 9.33, 72), ringMaterial); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; world.add(ring);
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(10.4, 0.09, 8, 96), new THREE.MeshStandardMaterial({ color: 0x24354a, emissive: 0x0a5a74, emissiveIntensity: 1.2, metalness: 0.75, roughness: 0.3 }));
    outerRing.rotation.x = Math.PI / 2; outerRing.position.y = -0.28; world.add(outerRing);

    const grid = new THREE.GridHelper(18, 18, 0x31526a, 0x172536); grid.position.y = 0.02; world.add(grid);
    const centerPlatform = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.65, 0.42, 32), new THREE.MeshStandardMaterial({ color: 0x172333, roughness: 0.42, metalness: 0.82 }));
    centerPlatform.position.y = 0.12; centerPlatform.receiveShadow = true; world.add(centerPlatform);
    const centerGlow = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.85, 48), new THREE.MeshBasicMaterial({ color: 0x4edfff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
    centerGlow.rotation.x = -Math.PI / 2; centerGlow.position.y = 0.35; world.add(centerGlow);

    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x172231, roughness: 0.42, metalness: 0.72 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x53d8ff, emissive: 0x177897, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.75 });
    [[-5.0,-2.8,1.35,1.65,3.2],[4.8,3.0,1.2,2.0,2.8],[-3.8,4.1,2.8,1.05,1.0],[3.6,-4.1,2.55,1.15,1.0]].forEach(([x,z,sx,sy,sz], index) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), coverMaterial); block.position.set(x, sy / 2, z); block.rotation.y = index % 2 ? -0.24 : 0.24; block.castShadow = quality === 'high'; block.receiveShadow = quality === 'high'; world.add(block);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.74, 0.07, sz * 1.04), accentMaterial); strip.position.set(x, sy + 0.035, z); strip.rotation.y = block.rotation.y; world.add(strip);
    });

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x0d131d, roughness: 0.58, metalness: 0.62 });
    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * Math.PI * 2;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.1 + (i % 3) * 0.35, 0.32), wallMaterial);
      wall.position.set(Math.cos(angle) * 11.35, 0.5, Math.sin(angle) * 11.35);
      wall.rotation.y = -angle + Math.PI / 2;
      world.add(wall);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.045, 0.36), accentMaterial);
      lamp.position.set(Math.cos(angle) * 11.08, 1.5 + (i % 3) * 0.18, Math.sin(angle) * 11.08);
      lamp.rotation.y = wall.rotation.y; world.add(lamp);
    }

    const towerMat = new THREE.MeshStandardMaterial({ color: 0x131d2a, roughness: 0.34, metalness: 0.84 });
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.72, 5.5, 0.72), towerMat);
      tower.position.set(Math.cos(angle) * 13.0, 1.6, Math.sin(angle) * 13.0); world.add(tower);
      const light = new THREE.PointLight(i % 2 ? 0x6c4dff : 0x3fdcff, 18, 12, 2);
      light.position.set(tower.position.x, 4.2, tower.position.z); scene.add(light);
    }

    const fighterVisuals = new Map<string, FighterVisual>();
    const weaponVisuals = new Map<string, WeaponVisual>();
    const fx = new ArenaFx(); scene.add(fx.group);
    const post = new ArenaPostFX(renderer, scene, camera, quality === 'high');
    const cameraDirector = new CameraDirector(camera, reducedMotion);
    let lastEventId = -1;
    let emphasisTarget: THREE.Vector3 | undefined;

    const worldPosition = (x: number, z: number, radius: number, y = 0) => {
      const scale = radius > 0 ? 8.45 / radius : 1;
      return new THREE.Vector3(x * scale * ARENA_SCALE, y, z * scale * ARENA_SCALE);
    };

    const syncFighters = () => {
      const current = viewRef.current;
      const active = new Set(current.fighters.map((fighter) => fighter.id));
      current.fighters.forEach((fighter) => {
        let visual = fighterVisuals.get(fighter.id);
        if (!visual) {
          const robot = makeRobot(fighter.color); world.add(robot.root);
          visual = { ...robot, target: new THREE.Vector3(), velocity: new THREE.Vector3(), lastPosition: new THREE.Vector3(), lastIntent: '', labelKey: '' };
          fighterVisuals.set(fighter.id, visual);
        }
        visual.target.copy(worldPosition(fighter.x, fighter.z, current.radius));
        visual.velocity.set(fighter.velocityX, 0, fighter.velocityZ);
        visual.root.visible = !fighter.eliminated;
        visual.root.scale.setScalar(fighter.respawning ? 0.72 : selectedRef.current === fighter.id ? 1.08 : 1);
        visual.body.rotation.z = Math.min(0.12, visual.velocity.length() * 0.01);
        visual.intentRing.visible = Boolean(fighter.intent) || selectedRef.current === fighter.id;
        (visual.intentRing.material as THREE.MeshBasicMaterial).opacity = selectedRef.current === fighter.id ? 0.94 : fighter.intent.toLowerCase().includes('attack') ? 0.84 : 0.34;
        (visual.directionLine.material as THREE.LineBasicMaterial).opacity = selectedRef.current === fighter.id ? 0.78 : 0.18;
        if (visual.velocity.lengthSq() > 0.01) visual.root.rotation.y = Math.atan2(visual.velocity.x, visual.velocity.z);
        const labelKey = `${fighter.name}|${Math.round(fighter.damage)}|${fighter.intent}|${selectedRef.current === fighter.id}`;
        if (labelKey !== visual.labelKey) {
          const material = visual.label.material as THREE.SpriteMaterial;
          material.map?.dispose();
          material.map = makeLabelTexture(fighter.name, fighter.damage, fighter.intent, fighter.color);
          material.opacity = selectedRef.current === fighter.id ? 1 : 0.82;
          material.needsUpdate = true;
          visual.labelKey = labelKey;
        }
        if (fighter.intent !== visual.lastIntent) {
          const intent = fighter.intent.toLowerCase(); const position = visual.target.clone(); const facing = visual.root.rotation.y;
          if (intent.includes('heavy')) fx.slash(position, facing, fighter.color, true); else if (intent.includes('attack')) fx.slash(position, facing, fighter.color, false);
          if (intent.includes('dodge') && visual.velocity.lengthSq() > 0.01) fx.dodge(position, visual.velocity, fighter.color);
          if (intent.includes('shield') || fighter.weapon === 'shield') fx.shield(position, fighter.color, 0.42);
          visual.lastIntent = fighter.intent;
        }
      });
      fighterVisuals.forEach((visual, id) => { if (!active.has(id)) { world.remove(visual.root); (visual.label.material as THREE.SpriteMaterial).map?.dispose(); fighterVisuals.delete(id); } });
    };

    const syncWeapons = () => {
      const current = viewRef.current; const active = new Set<string>();
      current.weapons.forEach((weapon) => {
        active.add(weapon.id); let visual = weaponVisuals.get(weapon.id);
        if (!visual) { visual = makeWeapon(weapon.type); world.add(visual.root); weaponVisuals.set(weapon.id, visual); }
        visual.root.visible = weapon.available; visual.root.position.copy(worldPosition(weapon.x, weapon.z, current.radius, 0.82));
      });
      weaponVisuals.forEach((visual, id) => { if (!active.has(id)) { world.remove(visual.root); weaponVisuals.delete(id); } });
    };

    const resize = () => { const rect = mount.getBoundingClientRect(); const width = Math.max(1, rect.width); const height = Math.max(1, rect.height); renderer.setSize(width, height, false); post.resize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();

    const clock = new THREE.Clock(); let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), 0.05); const current = viewRef.current; syncFighters(); syncWeapons();
      fighterVisuals.forEach((visual) => {
        visual.lastPosition.copy(visual.root.position); visual.root.position.lerp(visual.target, 1 - Math.pow(0.001, dt)); visual.glow.rotation.z += dt * 1.8; visual.intentRing.rotation.z -= dt * 1.25;
        visual.label.quaternion.copy(camera.quaternion);
        const moved = visual.root.position.distanceTo(visual.lastPosition);
        if (!reducedMotion && moved > 0.08 && visual.velocity.length() > 2.4 && Math.random() < (quality === 'high' ? 0.34 : 0.12)) fx.trail(visual.lastPosition.clone().setY(0.18), visual.root.position.clone().setY(0.18), visual.color, 0.045, 0.16);
      });
      weaponVisuals.forEach((visual) => { visual.root.rotation.y += dt * 1.2; visual.root.position.y = 0.78 + Math.sin(performance.now() * 0.003 + visual.root.position.x) * 0.12; visual.halo.rotation.z += dt * 0.9; });

      const newest = current.events[current.events.length - 1];
      if (newest && newest.id !== lastEventId) {
        lastEventId = newest.id; const actor = current.fighters.find((fighter) => fighter.id === newest.actor); const target = current.fighters.find((fighter) => fighter.id === newest.target); const subject = target ?? actor; const color = eventColor(newest.type);
        if (subject) {
          const position = worldPosition(subject.x, subject.z, current.radius, 0.35); emphasisTarget = position.clone();
          if (['hit','weapon-use','stock-lost','eliminated','weapon-pickup','chaos'].includes(newest.type)) {
            fx.ring(position, color, newest.type === 'eliminated' ? 1.0 : 0.52, newest.type === 'eliminated' ? 0.74 : 0.36);
            fx.burst({ position: position.clone().setY(newest.type === 'eliminated' ? 1.2 : 0.72), color, count: newest.type === 'eliminated' ? 54 : newest.type === 'stock-lost' ? 34 : 20, speed: newest.type === 'eliminated' ? 7.5 : 4.8, life: newest.type === 'eliminated' ? 0.9 : 0.52, size: newest.type === 'eliminated' ? 1.35 : 1 });
          }
        }
        if (actor && target) { const from = worldPosition(actor.x, actor.z, current.radius); const to = worldPosition(target.x, target.z, current.radius); fx.targetLink(from, to, actor.color, newest.type === 'weapon-use' ? 0.42 : 0.26); if (newest.type === 'weapon-use') fx.beam(from, to, 0xffd66b, 0.22); }
        if (newest.type === 'hit') { cameraDirector.impact(0.2, 'combat'); post.hit(0.24); }
        else if (newest.type === 'stock-lost') { cameraDirector.impact(0.42, 'ko'); post.hit(0.52); }
        else if (newest.type === 'eliminated') { cameraDirector.impact(0.58, 'ko'); post.hit(0.76); }
        else if (newest.type === 'weapon-use') { cameraDirector.impact(0.14, 'combat'); post.hit(newest.detail.toLowerCase().includes('bomb') ? 0.48 : 0.18); }
      }

      fx.update(dt); post.setChaos(current.chaos !== 'none'); post.update(dt);
      const visible = [...fighterVisuals.entries()].filter(([, visual]) => visual.root.visible);
      const selected = selectedRef.current ? fighterVisuals.get(selectedRef.current)?.root.position.clone() : undefined;
      if (selectedRef.current && selected) cameraDirector.setMode('focus', 0.1);
      cameraDirector.update({ fighterPositions: visible.map(([, visual]) => visual.root.position), focusTarget: selected, emphasisTarget, dt, time: performance.now() * 0.001 });

      const danger = current.chaos !== 'none';
      ringMaterial.opacity = danger ? 0.9 : 0.52 + Math.sin(performance.now() * 0.003) * 0.08;
      ringMaterial.color.setHex(danger ? 0xb86cff : 0x56e1ff); rim.color.setHex(danger ? 0xc85cff : 0x744cff); rim.intensity = danger ? 105 : 78; renderer.toneMappingExposure = danger ? 1.25 : 1.2; post.render();
    };
    loop();

    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); fx.dispose(); post.dispose();
      fighterVisuals.forEach((visual) => (visual.label.material as THREE.SpriteMaterial).map?.dispose());
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement); renderer.dispose();
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) { const mesh = object as THREE.Mesh; mesh.geometry?.dispose?.(); const material = (object as THREE.Mesh).material; const materials = Array.isArray(material) ? material : [material]; materials.forEach((entry) => entry?.dispose?.()); } });
    };
  }, [quality]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} aria-label="Three dimensional autonomous agent arena" />;
}
