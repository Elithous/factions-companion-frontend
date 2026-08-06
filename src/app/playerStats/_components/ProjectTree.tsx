import { Card } from "@/components/ui/card";
import type { NodeEffect, PersonalActivity, PersonalActivityType } from "@/types/player";

const SECTION_ORDER: PersonalActivityType[] = ['talent_picked', 'spec_picked', 'personal_project_picked'];

const SECTION_LABELS: Record<PersonalActivityType, string> = {
  talent_picked: 'Talents',
  spec_picked: 'Specializations',
  personal_project_picked: 'Personal Projects',
};

/**
 * The four paths a pick can belong to, in the order they're shown.
 *
 * These are fixed by the game. A node's path is really determined by which
 * branch root it descends from, which needs the project definitions; until
 * those are wired up this falls back to the activity's own `category`, and
 * anything that doesn't resolve lands in `UNASSIGNED`.
 */
const PATHS = ['MILITARY', 'ECONOMY', 'WORKER', 'SUPPORT'] as const;
type Path = typeof PATHS[number] | typeof UNASSIGNED;

/** Picks whose path can't be determined from the data we have. */
const UNASSIGNED = 'UNASSIGNED';

const PATH_LABELS: Record<Path, string> = {
  MILITARY: 'Military',
  ECONOMY: 'Economy',
  WORKER: 'Worker',
  SUPPORT: 'Support',
  [UNASSIGNED]: 'Unassigned',
};

function toPath(category: string | null | undefined): Path {
  const normalised = category?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return PATHS.find(path => path === normalised) ?? UNASSIGNED;
}

/**
 * How far a chain can indent before it stops nesting.
 *
 * Deep trees would otherwise walk off the right edge; past this depth items
 * stack at the same level and the tier badge carries the distinction.
 */
const MAX_DEPTH = 5;

/** `WOOD_PRODUCTION` to `Wood Production`. */
function formatNodeName(name: string) {
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * One effect as readable text.
 *
 * Multipliers arrive as a factor (1.04), which reads better as the percentage
 * it actually adds.
 */
function formatEffect(effect: NodeEffect): string {
  const subject = formatNodeName(effect.subtype ?? effect.type ?? '');

  if (typeof effect.multiplier === 'number') {
    const percent = Math.round((effect.multiplier - 1) * 1000) / 10;
    return `${percent >= 0 ? '+' : ''}${percent}% ${subject}`;
  }
  if (typeof effect.bonus === 'number') return `+${effect.bonus} ${subject}`;
  if (typeof effect.base === 'number') return `+${effect.base} ${subject}`;

  return subject;
}

function formatPickedAt(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** A pick placed in its branch. */
interface PlacedPick {
  activity: PersonalActivity;
  /** Indent level, from how far down the parent chain this node sits. */
  depth: number;
}

interface PathGroup {
  path: Path;
  picks: PlacedPick[];
}

/**
 * Orders a path's picks into their dependency chains and works out each one's
 * indent.
 *
 * Depth comes from the resolved `parentId`, walking up until a node whose
 * parent wasn't picked. That's the real chain — tier alone can't express it,
 * because two nodes at the same tier can sit on different branches.
 *
 * Children are emitted directly beneath their parent so a branch reads top to
 * bottom, with roots ordered by when they were taken.
 */
function toPlacedPicks(items: PersonalActivity[]): PlacedPick[] {
  const byNodeId = new Map<number, PersonalActivity>();
  for (const item of items) {
    if (item.nodeId !== null) byNodeId.set(item.nodeId, item);
  }

  const childrenOf = new Map<number | null, PersonalActivity[]>();
  for (const item of items) {
    // A parent that wasn't picked (or an unresolved pick) is treated as a root
    // of its own — better than hiding it under a node that isn't there.
    const parent =
      item.parentId !== null && byNodeId.has(item.parentId) ? item.parentId : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), item]);
  }

  const byOrder = (a: PersonalActivity, b: PersonalActivity) => a.order - b.order;
  const placed: PlacedPick[] = [];

  const walk = (parent: number | null, depth: number) => {
    for (const item of (childrenOf.get(parent) ?? []).sort(byOrder)) {
      placed.push({ activity: item, depth: Math.min(depth, MAX_DEPTH) });
      if (item.nodeId !== null) walk(item.nodeId, depth + 1);
    }
  };

  walk(null, 0);
  return placed;
}

/**
 * Groups a section's picks under the four paths.
 *
 * The pick order is assigned by the backend across the whole section, so the
 * numbers read as one progression: Worker #2 followed by Worker #7 tells you
 * five picks went elsewhere in between.
 */
function toPathGroups(items: PersonalActivity[]): PathGroup[] {
  const byPath = new Map<Path, PersonalActivity[]>();
  for (const item of items) {
    const path = toPath(item.category);
    byPath.set(path, [...(byPath.get(path) ?? []), item]);
  }

  const groups: PathGroup[] = [];
  for (const path of [...PATHS, UNASSIGNED] as Path[]) {
    const picks = byPath.get(path);
    if (!picks?.length) continue;

    groups.push({ path, picks: toPlacedPicks(picks) });
  }

  return groups;
}

interface ProjectTreeProps {
  hasPlayer: boolean;
  personalActivities: PersonalActivity[];
}

/**
 * Personal talents, specializations, and projects the player has picked.
 *
 * Each section splits into its categories, with the category as the node at the
 * top of its branch and picks indented by tier beneath it.
 */
export default function ProjectTree({ hasPlayer, personalActivities }: ProjectTreeProps) {
  if (!hasPlayer) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Select a player to view their project tree.</p>
      </Card>
    );
  }

  if (personalActivities.length === 0) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">No talents, specializations, or projects picked yet.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {SECTION_ORDER.map(type => {
        const items = personalActivities.filter(activity => activity.type === type);
        if (items.length === 0) return null;

        const groups = toPathGroups(items);

        return (
          <Card key={type} className="building-group-card project-tree-section p-4">
            <p className="mb-3 text-lg font-semibold">{SECTION_LABELS[type]}</p>

            <div className="project-tree-groups">
              {groups.map(group => (
                <div key={group.path} className="project-tree-group">
                  {/* The path heads its branch rather than repeating on every
                      row, which is what separates one branch from the next. */}
                  <p className={`project-tree-category path-${group.path.toLowerCase()}`}>
                    {PATH_LABELS[group.path]}
                  </p>

                  <div className="project-tree-items">
                    {group.picks.map(({ activity, depth }, index) => (
                      <div
                        key={`${activity.nodeId ?? activity.name}-${activity.timestamp}-${index}`}
                        className={`project-tree-item ${activity.ambiguous ? 'ambiguous' : ''}`}
                        style={{ '--depth': depth } as React.CSSProperties}
                      >
                        {/* Position in the section's overall pick order, not
                            within this path — gaps show where the player went
                            down another branch. */}
                        <span className="project-tree-order" title={`Pick ${activity.order}`}>
                          {activity.order}
                        </span>

                        <span className="project-tree-body">
                          <span className="project-tree-name">
                            {formatNodeName(activity.name)}
                            {activity.ambiguous && (
                              <span
                                className="project-tree-flag"
                                title="Several nodes share this name and tier, and the pick order didn't separate them"
                              >
                                ?
                              </span>
                            )}
                          </span>

                          {activity.effects.length > 0 && (
                            <span className="project-tree-effects">
                              {activity.effects.map(formatEffect).join(' · ')}
                            </span>
                          )}
                        </span>

                        <span className="project-tree-meta">
                          <span className="project-tree-tier">Tier {activity.tier ?? 1}</span>
                          <span>{formatPickedAt(activity.timestamp)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
