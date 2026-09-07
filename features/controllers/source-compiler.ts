import type { Action, AgentController, Observation } from '@/features/engine';
import { validateControllerSource, type SourcePolicyViolation } from './source-policy';

export class ControllerSourceError extends Error {
  constructor(
    message: string,
    public readonly violations: SourcePolicyViolation[] = [],
  ) {
    super(message);
    this.name = 'ControllerSourceError';
  }
}

type ControllerFactory = () => AgentController;

function freezeObservation(observation: Readonly<Observation>): Readonly<Observation> {
  const freeze = <T extends object>(value: T) => Object.freeze(value);
  return freeze({
    ...observation,
    self: freeze({ ...observation.self, position: freeze({ ...observation.self.position }), velocity: freeze({ ...observation.self.velocity }) }),
    enemies: freeze(observation.enemies.map((enemy) => freeze({ ...enemy, position: freeze({ ...enemy.position }), velocity: freeze({ ...enemy.velocity }) }))),
    weapons: freeze(observation.weapons.map((weapon) => freeze({ ...weapon, position: freeze({ ...weapon.position }) }))),
    arena: freeze({ ...observation.arena, wind: freeze({ ...observation.arena.wind }) }),
    recentEvents: freeze(observation.recentEvents.map((event) => freeze({ ...event, meta: event.meta ? freeze({ ...event.meta }) : undefined }))),
  }) as unknown as Readonly<Observation>;
}

/**
 * Compiles a controller for local development only.
 *
 * `new Function` is not a security boundary. Production model submissions must
 * use a Worker/process implementation of ControllerRuntime. Keeping this adapter
 * explicit prevents the headless engine from accidentally depending on it.
 */
export function compileTrustedControllerSource(source: string): () => AgentController {
  const violations = validateControllerSource(source);
  if (violations.length) throw new ControllerSourceError('Controller source violated policy.', violations);

  let factory: ControllerFactory;
  try {
    factory = new Function(`"use strict";\n${source}\n; return createController;`)() as ControllerFactory;
  } catch (error) {
    throw new ControllerSourceError(`Controller source could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (typeof factory !== 'function') {
    throw new ControllerSourceError('createController must be a function.');
  }

  return () => {
    const controller = factory();
    if (!controller || typeof controller.act !== 'function') {
      throw new ControllerSourceError('createController() must return an object with act(observation).');
    }
    return {
      act(observation: Readonly<Observation>): Action {
        return controller.act(freezeObservation(observation));
      },
    };
  };
}
