import { type InjectionKey, provide, inject } from 'vue';
import type { ICutterEngine } from '../services/engineAdapter';
import { createCutterEngine } from '../services/engineAdapter';

export const CutterEngineKey: InjectionKey<ICutterEngine> = Symbol('CutterEngineKey');

/**
 * Provedor do serviço de Engine para a árvore de componentes
 */
export function provideCutterEngine(customEngine?: ICutterEngine) {
  const engine = customEngine || createCutterEngine();
  provide(CutterEngineKey, engine);
  return engine;
}

/**
 * Injeção da Engine configurada
 */
export function useCutterEngine(): ICutterEngine {
  const engine = inject(CutterEngineKey);
  if (!engine) {
    return createCutterEngine();
  }
  return engine;
}
