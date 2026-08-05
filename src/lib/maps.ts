import type { StaticImageData } from 'next/image';

import Alpine from '../../public/maps/Alpine.png';
import Beralich from '../../public/maps/Beralich.png';
import Doma from '../../public/maps/Doma.png';
import Forgotten_Weald from '../../public/maps/Forgotten_Weald.png';
import Necropolis from '../../public/maps/Necropolis.png';
import Rivers from '../../public/maps/Rivers.png';
import Smallworld from '../../public/maps/Smallworld.png';
import Volbadihr from '../../public/maps/Volbadihr.png';
import Wetlands from '../../public/maps/Wetlands.png';
import Windmill from '../../public/maps/Windmill.png';

/**
 * Maps a backend map name to its background image.
 * Add new maps here and to `public/maps/` — nothing else needs to change.
 */
const MAP_IMAGES: Record<string, StaticImageData> = {
  Alpine,
  Beralich,
  Doma,
  Necropolis,
  Rivers,
  Smallworld,
  Volbadihr,
  Wetlands,
  Windmill,
  'Forgotten Weald': Forgotten_Weald,
};

export function getMapImage(name: string | undefined): StaticImageData | undefined {
  return name ? MAP_IMAGES[name] : undefined;
}
