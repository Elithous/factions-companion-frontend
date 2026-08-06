/**
 * Ambient declarations for plain stylesheet imports.
 *
 * Next ships types for `*.module.scss` (via `next-env.d.ts` -> `next/types/global`)
 * but not for global side-effect imports like `import './stats.scss'`, so editors
 * — and `tsc --noUncheckedSideEffectImports` — flag every one of them as an
 * unresolved module.
 *
 * These are intentionally bodyless: the imports exist purely for their side
 * effect, and nothing should be reading a value off them. CSS-module imports are
 * unaffected, because TypeScript prefers the longer, more specific wildcard
 * pattern (`*.module.scss`) when both match.
 */

declare module '*.scss';
declare module '*.sass';
declare module '*.css';
