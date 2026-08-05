import { Card } from '@/components/ui/card';
import type { BuildingGroup } from '@/types/player';

interface BuildingGroupCardProps {
  buildingGroup: BuildingGroup;
}

export default function BuildingGroupCard({ buildingGroup }: BuildingGroupCardProps) {
  return (
    <Card className="building-group-card p-4">
      <div className="flex items-start gap-4">
        {/* Building Image - placeholder for now */}
        <div className="building-image-placeholder">
          <p className="text-center text-xs text-muted-foreground">Image</p>
        </div>

        {/* Building Info */}
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-lg font-semibold">{buildingGroup.name}</p>

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
