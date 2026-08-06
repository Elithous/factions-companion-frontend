/**
 * Single entry point for the game domain.
 *
 * There is deliberately no static building table here: buildings, their costs
 * and their categories are game-specific and come from the backend. See
 * `./catalogue` and `useBuildingCatalogue`.
 */
export * from './types';
export * from './catalogue';
export * from './config';
export * from './costs';
export * from './effects';
export * from './planning';
