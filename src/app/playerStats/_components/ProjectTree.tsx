import { Card } from "@/components/ui/card";
import type { PersonalActivity, PersonalActivityType } from "@/types/player";

const SECTION_ORDER: PersonalActivityType[] = ['talent_picked', 'spec_picked', 'personal_project_picked'];

const SECTION_LABELS: Record<PersonalActivityType, string> = {
  talent_picked: 'Talents',
  spec_picked: 'Specializations',
  personal_project_picked: 'Personal Projects',
};

function formatPickedAt(timestampSeconds: number) {
  return new Date(timestampSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface ProjectTreeProps {
  hasPlayer: boolean;
  personalActivities: PersonalActivity[];
}

/**
 * Personal talents, specializations, and projects the player has picked,
 * grouped by type. Uses `PlayerStats.personalActivities`, which is already
 * fetched for the Village tab but wasn't displayed anywhere yet.
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
        const items = personalActivities
          .filter(activity => activity.type === type)
          .sort((a, b) => a.timestamp - b.timestamp);

        if (items.length === 0) return null;

        return (
          <Card key={type} className="building-group-card p-4">
            <p className="mb-3 text-lg font-semibold">{SECTION_LABELS[type]}</p>
            <div className="flex flex-col gap-2">
              {items.map((activity, index) => (
                <div
                  key={`${activity.name}-${activity.timestamp}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <span className="font-medium">{activity.name}</span>
                    {activity.category && (
                      <span className="ml-2 text-sm text-muted-foreground">{activity.category}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Tier {activity.tier}</span>
                    <span>{formatPickedAt(activity.timestamp)}</span>
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
