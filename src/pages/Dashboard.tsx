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
import { useLeads, useFolders } from '@/hooks/useFirebaseData';
import { useAuth } from '@/auth/AuthContext';
import { timestampToDate } from '@/lib/firestore';

export default function Dashboard() {
  const { user: authUser, profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { leads, loading } = useLeads(organizationId, { role: profile?.role, userId: authUser?.uid });
  const { folders, loading: foldersLoading } = useFolders(organizationId);

  if (!organizationId) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">No organization assigned. Please contact an admin.</p>
      </div>
    );
  }

  if (loading || foldersLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  // Calculate KPIs from real data
  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.convertedAt).length;
  const ongoingLeads = leads.filter(l => !l.convertedAt && !l.cancelledAt).length;
  const successRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;
  
  // Calculate average time to convert
  const convertedLeadsWithDates = leads.filter(l => l.convertedAt && l.createdAt);
  const avgTimeToConvert = convertedLeadsWithDates.length > 0 
    ? Math.round(
        convertedLeadsWithDates.reduce((sum, l) => {
          const created = timestampToDate(l.createdAt);
          const converted = timestampToDate(l.convertedAt!);
          const days = Math.floor((converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / convertedLeadsWithDates.length
      )
    : 0;

  // Calculate folder stats from real data
  const folderStats = folders.map(folder => {
    const folderLeads = leads.filter(l => l.folderId === folder.id);
    const convertedInFolder = folderLeads.filter(l => l.convertedAt).length;
    const conversionRate = folderLeads.length > 0 ? Math.round((convertedInFolder / folderLeads.length) * 100) : 0;
    return {
      folderId: folder.id,
      folderName: folder.name,
      totalLeads: folderLeads.length,
      conversionRate,
    };
  });

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
          Welcome back, {authUser?.displayName?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Here's what's happening with your leads today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Leads"
          value={totalLeads}
          subtitle="All time"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="Ongoing"
          value={ongoingLeads}
          subtitle="In pipeline"
          icon={Clock}
        />
        <KPICard
          title="Converted"
          value={convertedLeads}
          subtitle="Successfully closed"
          icon={CheckCircle}
          trend={{ value: 8, isPositive: true }}
        />
        <KPICard
          title="Success Rate"
          value={`${successRate}%`}
          subtitle={`Avg. ${avgTimeToConvert} days to convert`}
          icon={Target}
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-ups & Stats */}
        <div className="space-y-6">
          <FollowUpsList leads={leads} />
          <FolderStatsCard stats={folderStats} />
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
