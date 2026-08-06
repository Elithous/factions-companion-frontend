import Image from 'next/image';

import {
  formatBuildingName,
  getBuildingCategory,
  getBuildingFrame,
  getBuildingImage,
  type BuildingCategoryMap,
} from '@/lib/game/buildingAssets';

import './buildingIcon.scss';

export interface BuildingIconProps {
  /** Catalogue name, e.g. `GUARD_TOWER`. Empty/undefined is treated as the HQ. */
  buildingName: string | null | undefined;
  /**
   * The current game's building catalogue. Pass it wherever a game is in
   * scope — categories change between games, and the bundled fallback table
   * is out of date.
   */
  categories?: BuildingCategoryMap;
  /**
   * Current level. Only used by buildings whose artwork changes as they level
   * (the HQ); ignored by everything else.
   */
  level?: number;
  /** Rendered size in px, frame included. */
  size?: number;
  className?: string;
  /** Badges and the like, positioned over the sprite. */
  children?: React.ReactNode;
}

/**
 * A building sprite inside its category frame.
 *
 * The frame is a background rather than an <Image>, so the sprite can sit
 * inside its border without a second stacking layer to manage. Sprites are
 * pixel art, so they're rendered with nearest-neighbour scaling — the browser
 * default would blur them at these sizes.
 */
export default function BuildingIcon({
  buildingName,
  categories,
  level,
  size = 40,
  className = '',
  children,
}: BuildingIconProps) {
  const sprite = getBuildingImage(buildingName, level);
  const frame = getBuildingFrame(buildingName, categories);
  const category = getBuildingCategory(buildingName, categories);
  const label = formatBuildingName(buildingName);

  // The sprite is inset so the frame's border stays visible around it.
  const spriteSize = Math.round(size * 0.72);

  return (
    <div
      className={`building-icon ${category ? `category-${category.toLowerCase()}` : 'category-unknown'} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${frame})`,
      }}
    >
      {sprite ? (
        <Image
          src={sprite}
          alt={label}
          width={spriteSize}
          height={spriteSize}
          className="building-icon-sprite"
          unoptimized
        />
      ) : (
        // No artwork for this building yet — fall back to its initial so the
        // slot still reads as a distinct building rather than an empty frame.
        <span className="building-icon-fallback" aria-label={label}>
          {label.charAt(0)}
        </span>
      )}

      {children}
    </div>
  );
}
