import { controllerSubmissionSchema, type ControllerSubmission } from '@/features/controllers';
import type { TournamentResult } from '@/features/engine';
import type { MatchRecord } from '@/features/replay';
import { parseControllerLock, type ControllerLock } from './controller-lock';

export const TOURNAMENT_ARTIFACT_SCHEMA_VERSION = 1 as const;

export interface TournamentArtifact {
  schemaVersion: typeof TOURNAMENT_ARTIFACT_SCHEMA_VERSION;
  createdAt: string;
  lock: ControllerLock;
  submissions: ControllerSubmission[];
  tournament: TournamentResult;
  records: MatchRecord[];
}

export function createTournamentArtifact(input: Omit<TournamentArtifact, 'schemaVersion' | 'createdAt'>, createdAt = new Date().toISOString()): TournamentArtifact {
  return { schemaVersion: TOURNAMENT_ARTIFACT_SCHEMA_VERSION, createdAt, ...input };
}

export function serializeTournamentArtifact(artifact: TournamentArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertFiniteNumber(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a finite number`);
}

function assertString(value: unknown, path: string) {
  if (typeof value !== 'string') throw new Error(`${path} must be a string`);
}

function assertVec2(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  assertFiniteNumber(value.x, `${path}.x`);
  assertFiniteNumber(value.z, `${path}.z`);
}

function assertEvent(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  assertFiniteNumber(value.id, `${path}.id`);
  assertFiniteNumber(value.tick, `${path}.tick`);
  assertFiniteNumber(value.time, `${path}.time`);
  assertString(value.type, `${path}.type`);
  assertString(value.detail, `${path}.detail`);
  if (value.actor !== undefined) assertString(value.actor, `${path}.actor`);
  if (value.target !== undefined) assertString(value.target, `${path}.target`);
  if (value.meta !== undefined && !isObject(value.meta)) throw new Error(`${path}.meta must be an object`);
}

function assertFighter(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  assertString(value.id, `${path}.id`);
  assertString(value.name, `${path}.name`);
  assertString(value.color, `${path}.color`);
  assertVec2(value.position, `${path}.position`);
  assertVec2(value.velocity, `${path}.velocity`);
  ['damage','stocks','distanceToEdge','stunnedFor','respawnFor','shieldFor'].forEach((key) => assertFiniteNumber(value[key], `${path}.${key}`));
  if (typeof value.eliminated !== 'boolean') throw new Error(`${path}.eliminated must be boolean`);
  assertString(value.intent, `${path}.intent`);
  if (value.weapon !== undefined) assertString(value.weapon, `${path}.weapon`);
  if (!isObject(value.cooldowns)) throw new Error(`${path}.cooldowns must be an object`);
  const cooldowns = value.cooldowns;
  ['attack','heavyAttack','dodge'].forEach((key) => assertFiniteNumber(cooldowns[key], `${path}.cooldowns.${key}`));
  if (!isObject(value.stats)) throw new Error(`${path}.stats must be an object`);
  const stats = value.stats;
  ['attacks','hits','heavyAttacks','dodges','damageDealt','damageTaken','kos','stocksLost','weaponsPicked','weaponsUsed','distanceTravelled','timeNearEdge','timeInCenter']
    .forEach((key) => assertFiniteNumber(stats[key], `${path}.stats.${key}`));
}

function assertWeapon(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  assertString(value.id, `${path}.id`);
  assertString(value.type, `${path}.type`);
  assertVec2(value.position, `${path}.position`);
  if (typeof value.available !== 'boolean') throw new Error(`${path}.available must be boolean`);
  assertFiniteNumber(value.respawnAt, `${path}.respawnAt`);
}

function assertWorldState(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  assertString(value.matchId, `${path}.matchId`);
  assertFiniteNumber(value.seed, `${path}.seed`);
  assertString(value.phase, `${path}.phase`);
  ['tick','time','timeLeft','arenaRadius'].forEach((key) => assertFiniteNumber(value[key], `${path}.${key}`));
  if (!isObject(value.chaos)) throw new Error(`${path}.chaos must be an object`);
  const chaos = value.chaos;
  assertString(chaos.type, `${path}.chaos.type`);
  assertFiniteNumber(chaos.until, `${path}.chaos.until`);
  assertVec2(chaos.wind, `${path}.chaos.wind`);
  if (!Array.isArray(value.fighters) || value.fighters.length < 2) throw new Error(`${path}.fighters must contain at least two fighters`);
  value.fighters.forEach((fighter, index) => assertFighter(fighter, `${path}.fighters[${index}]`));
  if (!Array.isArray(value.weapons)) throw new Error(`${path}.weapons must be an array`);
  value.weapons.forEach((weapon, index) => assertWeapon(weapon, `${path}.weapons[${index}]`));
  if (!Array.isArray(value.events)) throw new Error(`${path}.events must be an array`);
  value.events.forEach((event, index) => assertEvent(event, `${path}.events[${index}]`));
  if (value.winnerId !== undefined) assertString(value.winnerId, `${path}.winnerId`);
}

function assertAction(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  assertFiniteNumber(value.moveX, `${path}.moveX`);
  assertFiniteNumber(value.moveZ, `${path}.moveZ`);
  for (const key of ['attack','heavyAttack','dodge','pickup','useWeapon']) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') throw new Error(`${path}.${key} must be boolean`);
  }
  if (value.aimX !== undefined) assertFiniteNumber(value.aimX, `${path}.aimX`);
  if (value.aimZ !== undefined) assertFiniteNumber(value.aimZ, `${path}.aimZ`);
  if (value.intent !== undefined) assertString(value.intent, `${path}.intent`);
}

function assertArenaConfig(value: unknown, path: string) {
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  ['seed','durationSeconds','tickRate','startRadius','outMargin','stocksPerAgent','respawnSeconds'].forEach((key) => assertFiniteNumber(value[key], `${path}.${key}`));
  if (!isObject(value.chaos)) throw new Error(`${path}.chaos must be an object`);
  const chaos = value.chaos;
  if (typeof chaos.enabled !== 'boolean') throw new Error(`${path}.chaos.enabled must be boolean`);
  ['firstAtSeconds','intervalMinSeconds','intervalMaxSeconds','durationSeconds'].forEach((key) => assertFiniteNumber(chaos[key], `${path}.chaos.${key}`));
  if (!isObject(value.weapons)) throw new Error(`${path}.weapons must be an object`);
  const weapons = value.weapons;
  if (typeof weapons.enabled !== 'boolean') throw new Error(`${path}.weapons.enabled must be boolean`);
  assertFiniteNumber(weapons.respawnSeconds, `${path}.weapons.respawnSeconds`);
  if (!Array.isArray(weapons.types) || weapons.types.some((item) => typeof item !== 'string')) throw new Error(`${path}.weapons.types must be a string array`);
}

function assertReplayRecord(value: unknown, index: number): asserts value is MatchRecord {
  const path = `records[${index}]`;
  if (!isObject(value)) throw new Error(`${path} must be an object`);
  if (value.schemaVersion !== 1) throw new Error(`${path} has unsupported schemaVersion`);
  assertString(value.engineVersion, `${path}.engineVersion`);
  assertString(value.createdAt, `${path}.createdAt`);
  assertFiniteNumber(value.seed, `${path}.seed`);
  assertArenaConfig(value.config, `${path}.config`);
  if (!Array.isArray(value.controllers) || value.controllers.length < 2) throw new Error(`${path}.controllers must contain at least two entries`);
  value.controllers.forEach((controller, controllerIndex) => {
    const controllerPath = `${path}.controllers[${controllerIndex}]`;
    if (!isObject(controller)) throw new Error(`${controllerPath} must be an object`);
    assertString(controller.agentId, `${controllerPath}.agentId`);
    assertString(controller.controllerId, `${controllerPath}.controllerId`);
  });
  assertWorldState(value.initialState, `${path}.initialState`);
  if (!Array.isArray(value.ticks) || value.ticks.length === 0) throw new Error(`${path}.ticks must be a non-empty array`);
  let previousTick = -1;
  value.ticks.forEach((tick, tickIndex) => {
    const tickPath = `${path}.ticks[${tickIndex}]`;
    if (!isObject(tick)) throw new Error(`${tickPath} must be an object`);
    assertFiniteNumber(tick.tick, `${tickPath}.tick`);
    assertFiniteNumber(tick.time, `${tickPath}.time`);
    if ((tick.tick as number) <= previousTick) throw new Error(`${tickPath}.tick must be strictly increasing`);
    previousTick = tick.tick as number;
    if (!isObject(tick.actions)) throw new Error(`${tickPath}.actions must be an object`);
    Object.entries(tick.actions).forEach(([agentId, action]) => assertAction(action, `${tickPath}.actions.${agentId}`));
    assertWorldState(tick.state, `${tickPath}.state`);
    if ((tick.state as Record<string, unknown>).tick !== tick.tick) throw new Error(`${tickPath}.state.tick must match tick`);
  });
  if (!Array.isArray(value.events)) throw new Error(`${path}.events must be an array`);
  value.events.forEach((event, eventIndex) => assertEvent(event, `${path}.events[${eventIndex}]`));
  if (value.summary !== undefined && !isObject(value.summary)) throw new Error(`${path}.summary must be an object when present`);
}

function assertTournament(value: unknown) {
  if (!isObject(value)) throw new Error('Artifact tournament result is missing.');
  if (!Array.isArray(value.seeds) || value.seeds.some((seed) => typeof seed !== 'number' || !Number.isFinite(seed))) throw new Error('tournament.seeds must be a number array');
  if (!Array.isArray(value.matches)) throw new Error('tournament.matches must be an array');
  if (!Array.isArray(value.agents) || value.agents.length < 2) throw new Error('tournament.agents must contain at least two agents');
  value.agents.forEach((agent, index) => {
    if (!isObject(agent)) throw new Error(`tournament.agents[${index}] must be an object`);
    assertString(agent.id, `tournament.agents[${index}].id`);
    assertString(agent.name, `tournament.agents[${index}].name`);
    ['matches','wins','winRate','averageRank'].forEach((key) => assertFiniteNumber(agent[key], `tournament.agents[${index}].${key}`));
    if (!isObject(agent.fingerprint)) throw new Error(`tournament.agents[${index}].fingerprint must be an object`);
  });
}

export function parseTournamentArtifact(input: unknown): TournamentArtifact {
  if (!isObject(input)) throw new Error('Artifact must be a JSON object.');
  if (input.schemaVersion !== TOURNAMENT_ARTIFACT_SCHEMA_VERSION) throw new Error('Unsupported tournament artifact schema version.');
  assertString(input.createdAt, 'createdAt');
  if (!Array.isArray(input.submissions) || input.submissions.length < 2) throw new Error('Artifact must contain at least two submissions.');
  if (!Array.isArray(input.records) || input.records.length === 0) throw new Error('Artifact must contain replay records.');
  assertTournament(input.tournament);

  const submissions = input.submissions.map((submission, index) => {
    const parsed = controllerSubmissionSchema.safeParse(submission);
    if (!parsed.success) throw new Error(`Invalid submission at index ${index}: ${parsed.error.issues[0]?.message ?? 'schema error'}`);
    return parsed.data;
  });
  const lock = parseControllerLock(input.lock);
  input.records.forEach(assertReplayRecord);

  const lockedIds = new Set(lock.controllers.map((controller) => controller.agentId));
  for (const submission of submissions) if (!lockedIds.has(submission.agentId)) throw new Error(`Submission ${submission.agentId} is not present in ControllerLock`);
  for (const record of input.records as unknown as MatchRecord[]) {
    if (record.seed !== record.config.seed) throw new Error(`Replay seed ${record.seed} does not match config.seed`);
    for (const controller of record.controllers) if (!lockedIds.has(controller.agentId)) throw new Error(`Replay controller ${controller.agentId} is not present in ControllerLock`);
  }

  return {
    schemaVersion: TOURNAMENT_ARTIFACT_SCHEMA_VERSION,
    createdAt: input.createdAt as string,
    lock,
    submissions,
    tournament: input.tournament as unknown as TournamentResult,
    records: input.records as unknown as MatchRecord[],
  };
}

export function parseTournamentArtifactJson(json: string): TournamentArtifact {
  let value: unknown;
  try { value = JSON.parse(json); }
  catch (error) { throw new Error(`Invalid artifact JSON: ${error instanceof Error ? error.message : String(error)}`); }
  return parseTournamentArtifact(value);
}
