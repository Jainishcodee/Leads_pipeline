import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/leads/StatusBadge';
import { cn } from '@/lib/utils';
import { timestampToDate } from '@/lib/firestore';
import type { Lead } from '@/types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface FollowUpsListProps {
  leads: Lead[];
  className?: string;
}

export function FollowUpsList({ leads, className }: FollowUpsListProps) {
  const navigate = useNavigate();

  const leadsWithFollowUp = leads
    .filter(lead => lead.nextFollowUpDate && lead.status !== 'converted' && lead.status !== 'cancelled')
    .sort(
      (a, b) => timestampToDate(a.nextFollowUpDate!).getTime() - timestampToDate(b.nextFollowUpDate!).getTime()
    )
    .slice(0, 5);

  const getDateLabel = (date: Date) => {
    if (isPast(date) && !isToday(date)) return 'Overdue';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  return (
    <div className={cn('card-premium', className)}>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-mocha-500" />
          <h3 className="font-semibold">Today's Follow-ups</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          View All <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      <div className="divide-y divide-border/50">
        {leadsWithFollowUp.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p>No follow-ups scheduled</p>
          </div>
        ) : (
          leadsWithFollowUp.map((lead) => {
            const followUpDate = timestampToDate(lead.nextFollowUpDate!);
            const isOverdue = isPast(followUpDate) && !isToday(followUpDate);
            
            return (
              <div 
                key={lead.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/dashboard/leads/${lead.id}`)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-mocha-100 text-mocha-700 text-sm">
                      {lead.companyName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lead.companyName}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {lead.managerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'flex items-center gap-1 text-sm font-medium',
                      isOverdue ? 'text-destructive' : isToday(followUpDate) ? 'text-mocha-600' : 'text-muted-foreground'
                    )}>
                      <Clock className="w-3.5 h-3.5" />
                      {getDateLabel(followUpDate)}
                    </div>
                    <StatusBadge status={lead.status} className="mt-1" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
