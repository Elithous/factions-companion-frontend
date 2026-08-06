/**
 * Artwork lookup for buildings: the sprite, and the category frame behind it.
 *
 * Paths are derived from the building name rather than listed one by one, so a
 * building the local catalogue doesn't know about still gets its sprite as soon
 * as the file exists in `public/buildings`.
 */

/** Anything carrying a name and its categories — config entry or catalogue entry. */
type CategorisedBuilding = { name: string; category?: readonly string[] };

/** Categories that have a slot frame. Mirrors `public/buildings/slots`. */
export const BUILDING_CATEGORIES = ['ECONOMY', 'MILITARY', 'SUPPORT', 'WORKER'] as const;
export type BuildingCategory = typeof BUILDING_CATEGORIES[number];

/** Name to primary category, as read from a game's own config. */
export type BuildingCategoryMap = Record<string, BuildingCategory | null>;

/**
 * Names whose sprite is filed under a different name.
 *
 * `HQ` is the one real case: the catalogue calls it HQ, the artwork is
 * `town_center*.png`. Add to this rather than renaming the assets.
 */
const SPRITE_ALIASES: Record<string, string> = {
  HQ: 'town_center',
};

/**
 * Buildings whose artwork changes as they level up.
 *
 * Each number is the level a tier starts at, and is also its filename suffix —
 * `town_center_10.png` covers levels 10 to 14. Adding a tier means dropping in
 * `<slug>_<level>.png` and listing the level here.
 */
const LEVELLED_SPRITES: Record<string, readonly number[]> = {
  town_center: [1, 5, 10, 15, 20],
};

/** The tier slug for a levelled building, or the base slug if it has no tiers. */
function toLevelledSlug(slug: string, level: number | undefined): string {
  const tiers = LEVELLED_SPRITES[slug];
  if (!tiers?.length || level === undefined) return slug;

  // A level picks the highest tier it has reached. Below the lowest band it
  // falls back to the first tier rather than the top-tier artwork, which would
  // look wrong on a fresh village.
  let resolved = tiers[0];
  for (const tier of tiers) {
    if (level >= tier) resolved = tier;
  }
  return `${slug}_${resolved}`;
}

/**
 * A few buildings sit in two categories (Arena is military and support). The
 * first is the primary one, and the only one a single frame can show.
 */
const primaryCategory = (categories: readonly string[] | undefined): BuildingCategory | null => {
  const first = categories?.[0]?.toUpperCase();
  return first && (BUILDING_CATEGORIES as readonly string[]).includes(first)
    ? (first as BuildingCategory)
    : null;
};

/** Builds the name-to-category lookup for a game from its catalogue. */
export function toBuildingCategoryMap(
  buildings: readonly CategorisedBuilding[] | undefined
): BuildingCategoryMap | undefined {
  if (!buildings?.length) return undefined;

  const map: BuildingCategoryMap = {};
  for (const building of buildings) {
    // Recorded even when null: an explicit "no category" from the config must
    // beat the fallback table, which disagrees for at least one building.
    map[building.name.toUpperCase()] = primaryCategory(building.category);
  }
  return map;
}

/** Sprites present in `public/buildings`, so missing art degrades instead of 404ing. */
const AVAILABLE_SPRITES = new Set([
  'academy', 'arena', 'builders_bureau', 'furnace', 'garrison_hall', 'guard_tower',
  'guardian_training_center', 'guild_hall', 'house', 'knight_training_center', 'market',
  'mercenary_office', 'mine', 'obelisk', 'recycling_workshop', 'research_center', 'sawmill',
  'shipyard', 'storage', 'tavern', 'town_hall', 'training_center', 'warehouse', 'woodcutter',
  // HQ tiers. `town_center` (unsuffixed) is the fallback when no level is known
  // and is identical to the level-20 art.
  'town_center', 'town_center_1', 'town_center_5', 'town_center_10',
  'town_center_15', 'town_center_20',
]);

/** Frame for buildings the catalogue gives no category. */
const DEFAULT_FRAME = '/buildings/slots/slot.svg';

/** `GUARD_TOWER` and `Guard Tower` both resolve to `guard_tower`. */
function toSpriteSlug(buildingName: string): string {
  const normalised = buildingName.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (SPRITE_ALIASES[normalised] ?? normalised).toLowerCase();
}

/**
 * Sprite path, or null when there's no artwork for this building.
 *
 * `level` only matters for buildings with levelled artwork (the HQ); everything
 * else ignores it. A tier whose image hasn't been added yet falls back to the
 * base sprite rather than resolving to a missing file.
 */
export function getBuildingImage(
  buildingName: string | null | undefined,
  level?: number,
): string | null {
  if (!buildingName) return null;

  const slug = toSpriteSlug(buildingName);
  const levelled = toLevelledSlug(slug, level);

  if (AVAILABLE_SPRITES.has(levelled)) return `/buildings/${levelled}.png`;
  return AVAILABLE_SPRITES.has(slug) ? `/buildings/${slug}.png` : null;
}

/**
 * Primary category for a building, per the game's own catalogue.
 *
 * Returns null when no catalogue is to hand or the building isn't in it —
 * there is no bundled fallback, because categories are game-specific and a
 * stale guess would frame buildings wrongly.
 */
export function getBuildingCategory(
  buildingName: string | null | undefined,
  categories?: BuildingCategoryMap
): BuildingCategory | null {
  if (!buildingName || !categories) return null;

  const normalised = buildingName.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return categories[normalised] ?? null;
}

/**
 * Frame path for a building.
 *
 * Buildings with no category get the plain default slot rather than nothing, so
 * an uncategorised building (House, in the current config) still sits in a
 * proper tile instead of a hand-drawn stand-in.
 */
export function getBuildingFrame(
  buildingName: string | null | undefined,
  categories?: BuildingCategoryMap
): string {
  const category = getBuildingCategory(buildingName, categories);
  return category ? `/buildings/slots/slot_${category.toLowerCase()}.svg` : DEFAULT_FRAME;
}

/** `GUARD_TOWER` to `Guard Tower`, for display. */
export function formatBuildingName(buildingName: string | null | undefined): string {
  if (!buildingName) return 'HQ';

  return buildingName
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}
