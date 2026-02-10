import { useNavigate } from 'react-router-dom';
import { FolderOpen, ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { FolderStats } from '@/types';

interface FolderStatsCardProps {
  stats: FolderStats[];
  className?: string;
}

export function FolderStatsCard({ stats, className }: FolderStatsCardProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('card-premium', className)}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-mocha-500" />
          <h3 className="font-semibold">Folder Performance</h3>
        </div>
      </div>
      
      <div className="divide-y divide-border/50">
        {stats.map((folder) => (
          <div 
            key={folder.folderId}
            className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/folders/${folder.folderId}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{folder.folderName}</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{folder.convertedLeads}/{folder.totalLeads}</span>
                <span className="font-medium text-mocha-600">{folder.conversionRate.toFixed(1)}%</span>
              </div>
            </div>
            <Progress 
              value={folder.conversionRate} 
              className="h-2 bg-mocha-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
