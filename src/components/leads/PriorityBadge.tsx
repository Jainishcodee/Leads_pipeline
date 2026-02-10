import { cn } from '@/lib/utils';
import type { LeadPriority } from '@/types';

interface PriorityBadgeProps {
  priority: LeadPriority;
  className?: string;
}

const priorityConfig: Record<LeadPriority, { label: string; className: string }> = {
  low: { 
    label: 'Low', 
    className: 'bg-slate-100 text-slate-600' 
  },
  medium: { 
    label: 'Medium', 
    className: 'bg-amber-100 text-amber-700' 
  },
  high: { 
    label: 'High', 
    className: 'bg-rose-100 text-rose-700' 
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
