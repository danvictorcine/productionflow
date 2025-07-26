// @/src/lib/app-config.ts

/**
 * Este arquivo serve como um "painel de controle" no código para definir
 * os limites para usuários na versão Beta (não-administradores).
 *
 * Para ajustar os limites, basta alterar os valores numéricos abaixo.
 */
export const BETA_LIMITS = {
  /** O número máximo de projetos (todos os tipos) que um usuário pode criar. */
  MAX_PROJECTS_PER_USER: 5,

  /** O número máximo de itens (imagens, textos, etc.) que podem ser adicionados a um único moodboard. */
  MAX_ITEMS_PER_MOODBOARD: 25,

  /** O número máximo de quadros (painéis) que podem ser adicionados a uma única cena de storyboard. */
  MAX_PANELS_PER_STORYBOARD_SCENE: 20,
};
