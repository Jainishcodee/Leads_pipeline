import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types';

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  new: { 
    label: 'New', 
    className: 'bg-blue-50 text-blue-700 border-blue-200' 
  },
  contacted: { 
    label: 'Contacted', 
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200' 
  },
  qualified: { 
    label: 'Qualified', 
    className: 'bg-teal-50 text-teal-700 border-teal-200' 
  },
  sample_requested: { 
    label: 'Sample Requested', 
    className: 'bg-amber-50 text-amber-700 border-amber-200' 
  },
  sample_sent: { 
    label: 'Sample Sent', 
    className: 'bg-orange-50 text-orange-700 border-orange-200' 
  },
  negotiation: { 
    label: 'Negotiation', 
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200' 
  },
  converted: { 
    label: 'Converted', 
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
  },
  cancelled: { 
    label: 'Cancelled', 
    className: 'bg-red-50 text-red-700 border-red-200' 
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
