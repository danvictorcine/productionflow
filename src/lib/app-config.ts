
// @/src/lib/app-config.ts

import type { BetaLimits } from './types';

/**
 * Este arquivo serve como um "painel de controle" no código para definir
 * os limites PADRÃO para usuários na versão Beta (não-administradores).
 * Estes valores são usados como fallback se nada for encontrado no Firestore.
 */
export const DEFAULT_BETA_LIMITS: BetaLimits = {
  /** O número máximo de projetos (todos os tipos) que um usuário pode criar. */
  MAX_PROJECTS_PER_USER: 20,

  /** O número máximo de itens (imagens, textos, etc.) que podem ser adicionados a um único moodboard. */
  MAX_ITEMS_PER_MOODBOARD: 25,

  /** O número máximo de quadros (painéis) que podem ser adicionados a uma única cena de storyboard. */
  MAX_PANELS_PER_STORYBOARD_SCENE: 20,
};
