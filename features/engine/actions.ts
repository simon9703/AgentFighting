import type { Action } from './types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));

export const IDLE_ACTION: Action = {
  moveX: 0,
  moveZ: 0,
  attack: false,
  heavyAttack: false,
  dodge: false,
  pickup: false,
  useWeapon: false,
  intent: 'IDLE',
};

export function sanitizeAction(input: Action | null | undefined): Action {
  if (!input) return { ...IDLE_ACTION };

  let moveX = clamp(input.moveX, -1, 1);
  let moveZ = clamp(input.moveZ, -1, 1);
  const length = Math.hypot(moveX, moveZ);
  if (length > 1) {
    moveX /= length;
    moveZ /= length;
  }

  return {
    moveX,
    moveZ,
    attack: Boolean(input.attack),
    heavyAttack: Boolean(input.heavyAttack),
    dodge: Boolean(input.dodge),
    pickup: Boolean(input.pickup),
    useWeapon: Boolean(input.useWeapon),
    aimX: clamp(input.aimX ?? 0, -1, 1),
    aimZ: clamp(input.aimZ ?? 0, -1, 1),
    intent: String(input.intent ?? 'UNSPECIFIED').slice(0, 64),
  };
}
