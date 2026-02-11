import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Clock,
  Target
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { FollowUpsList } from '@/components/dashboard/FollowUpsList';
import { FolderStatsCard } from '@/components/dashboard/FolderStatsCard';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { 
  mockDashboardKPIs, 
  mockFolderStats,
  currentUser 
} from '@/data/mockData';
import { useLeads } from '@/hooks/useFirebaseData';

export default function Dashboard() {
  const { leads, loading } = useLeads('org_1');

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // Get today's follow-ups
  const todayFollowUps = leads.filter(lead => {
    if (!lead.nextFollowUpDate) return false;
    const followUp = new Date(lead.nextFollowUpDate);
    const today = new Date();
    return followUp.toDateString() === today.toDateString() ||
           followUp < today;
  });

  // Get recent leads
  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, 5);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Welcome */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-foreground">
          Welcome back, {currentUser.name.split(' ')[0]}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Here's what's happening with your leads today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Leads"
          value={mockDashboardKPIs.totalLeads}
          subtitle="All time"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="Ongoing"
          value={mockDashboardKPIs.ongoingLeads}
          subtitle="In pipeline"
          icon={Clock}
        />
        <KPICard
          title="Converted"
          value={mockDashboardKPIs.convertedLeads}
          subtitle="Successfully closed"
          icon={CheckCircle}
          trend={{ value: 8, isPositive: true }}
        />
        <KPICard
          title="Success Rate"
          value={`${mockDashboardKPIs.successRate}%`}
          subtitle={`Avg. ${mockDashboardKPIs.avgTimeToConvert} days to convert`}
          icon={Target}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-ups & Stats */}
        <div className="space-y-6">
          <FollowUpsList leads={leads} />
          <FolderStatsCard stats={mockFolderStats} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="card-premium">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">Recent Leads</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Latest activity across all folders
              </p>
            </div>
            <LeadsTable leads={recentLeads} showFolder />
          </div>
        </div>
      </div>
    </div>
  );
}
