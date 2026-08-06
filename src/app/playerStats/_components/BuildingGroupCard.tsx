import BuildingIcon from '@/components/features/game/BuildingIcon';
import { Card } from '@/components/ui/card';
import { formatBuildingName, type BuildingCategoryMap } from '@/lib/game/buildingAssets';
import type { BuildingGroup } from '@/types/player';

interface BuildingGroupCardProps {
  buildingGroup: BuildingGroup;
  /** The selected game's building catalogue, for the category frame. */
  categories?: BuildingCategoryMap;
}

export default function BuildingGroupCard({ buildingGroup, categories }: BuildingGroupCardProps) {
  return (
    <Card className="building-group-card p-4">
      <div className="flex items-start gap-4">
        <BuildingIcon buildingName={buildingGroup.name} categories={categories} size={72} />

        {/* Building Info */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-semibold">{formatBuildingName(buildingGroup.name)}</p>

          <div className="flex gap-4">
            <p className="text-sm">
              {buildingGroup.totalCount} Total
            </p>
          </div>

          {buildingGroup.levelBreakdown.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {buildingGroup.levelBreakdown.map((item, idx) => (
                <p key={idx} className="text-sm">
                  {item.count}x Level {item.level}
                  {idx < buildingGroup.levelBreakdown.length - 1 && ','}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
