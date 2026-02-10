import { useState } from 'react';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Filter,
  ListTodo,
  Target,
  Calendar,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KPICard } from '@/components/dashboard/KPICard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/leads/StatusBadge';
import { format, isAfter, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { mockLeads, mockTasks, mockActivities, mockUsers, mockFolderStats } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [taskFilter, setTaskFilter] = useState({
    assignedTo: 'all',
    status: 'all',
    priority: 'all',
  });

  const [showFilter, setShowFilter] = useState(false);

  // Calculate KPIs
  const totalLeads = mockLeads.length;
  const activeTasks = mockTasks.filter(t => t.status !== 'done').length;
  const overdueTasks = mockTasks.filter(t => {
    if (t.status === 'done') return false;
    if (!t.dueDate) return false;
    return isAfter(new Date(), new Date(t.dueDate));
  }).length;
  const teamMembers = mockUsers.filter(u => u.role === 'member').length;

  // Get leads with active tasks
  const leadsWithTasks = mockLeads.map(lead => {
    const activeTasks = mockTasks.filter(t => t.leadId === lead.id && t.status !== 'done').length;
    const lastActivity = mockActivities
      .filter(a => a.leadId === lead.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return { ...lead, activeTasks, lastActivity };
  });

  // Get all tasks with lead info
  const tasksWithLeads = mockTasks.map(task => {
    const lead = mockLeads.find(l => l.id === task.leadId);
    const assignedUser = mockUsers.find(u => u.id === task.assignedToId);
    return { ...task, lead, assignedUser };
  });

  // Filter tasks
  const filteredTasks = tasksWithLeads.filter(task => {
    if (taskFilter.assignedTo && taskFilter.assignedTo !== 'all' && task.assignedToId !== taskFilter.assignedTo) return false;
    if (taskFilter.status && taskFilter.status !== 'all' && task.status !== taskFilter.status) return false;
    if (taskFilter.priority && taskFilter.priority !== 'all' && task.priority !== taskFilter.priority) return false;
    return true;
  });

  // Get overdue tasks
  const overdueTasks_list = tasksWithLeads.filter(t => {
    if (t.status === 'done') return false;
    if (!t.dueDate) return false;
    return isAfter(new Date(), new Date(t.dueDate));
  });

  // Get team performance
  const teamPerformance = mockUsers
    .filter(u => u.role === 'member')
    .map(user => {
      const userTasks = mockTasks.filter(t => t.assignedToId === user.id);
      const activeCount = userTasks.filter(t => t.status !== 'done').length;
      const overdueCount = userTasks.filter(t => {
        if (t.status === 'done') return false;
        if (!t.dueDate) return false;
        return isAfter(new Date(), new Date(t.dueDate));
      }).length;
      const completedCount = userTasks.filter(t => t.status === 'done').length;
      return { user, activeCount, overdueCount, completedCount };
    });

  // Get recent activities
  const recentActivities = [...mockActivities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Get today's follow-ups (tasks due today)
  const todayFollowUps = tasksWithLeads.filter(task => {
    if (!task.dueDate) return false;
    return isToday(new Date(task.dueDate));
  });

  // Get leads with follow-ups scheduled
  const followUpLeads = mockLeads
    .filter(lead => lead.nextFollowUpDate && lead.status !== 'converted' && lead.status !== 'cancelled')
    .sort((a, b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime())
    .slice(0, 4);

  const getDateLabel = (date: Date) => {
    if (isPast(date) && !isToday(date)) return 'Overdue';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  // Get activity icon
  const getActivityIcon = (description: string) => {
    if (description.includes('Completed task')) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (description.includes('Changed status')) return <TrendingUp className="w-4 h-4 text-mocha-600" />;
    if (description.includes('Assigned')) return <Users className="w-4 h-4 text-blue-600" />;
    return <Activity className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Admin Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">
          Monitor leads, tasks, and team activity at a glance.
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
          title="Active Tasks"
          value={activeTasks}
          subtitle="Across all leads"
          icon={ListTodo}
        />
        <KPICard
          title="Overdue Tasks"
          value={overdueTasks}
          subtitle="Needs attention"
          icon={AlertCircle}
        />
        <KPICard
          title="Team Members"
          value={teamMembers + 1}
          subtitle="5 total users"
          icon={Target}
        />
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="lead-overview" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="lead-overview">Lead Overview</TabsTrigger>
          <TabsTrigger value="all-tasks">All Tasks</TabsTrigger>
          <TabsTrigger value="activity-timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="team-workload">Team Workload</TabsTrigger>
        </TabsList>

        {/* Lead Overview Tab */}
        <TabsContent value="lead-overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Leads */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle className="text-base font-semibold">Active Leads</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">4 leads in pipeline</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leadsWithTasks.slice(0, 4).map(lead => {
                    const assignedUser = mockUsers.find(u => u.name === lead.createdByName);
                    return (
                      <div key={lead.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-10 w-10 bg-mocha-100">
                            <AvatarFallback className="text-mocha-700 font-medium text-sm">
                              {lead.companyName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium">{lead.companyName}</h4>
                            <p className="text-xs text-muted-foreground">{lead.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              lead.status === 'qualified' && 'bg-teal-100 text-teal-700 border-teal-200',
                              lead.status === 'negotiation' && 'bg-yellow-100 text-yellow-700 border-yellow-200',
                              lead.status === 'contacted' && 'bg-blue-100 text-blue-700 border-blue-200'
                            )}
                          >
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                          </Badge>
                          <div className="text-right min-w-[80px]">
                            <p className="text-xs font-medium text-muted-foreground">{assignedUser?.name || lead.createdByName}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.activeTasks} active tasks
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(lead.createdAt), 'MMM d')}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Today's Follow-ups */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Today's Follow-ups</CardTitle>
                    <Button variant="ghost" size="sm" className="ml-auto text-xs h-6 px-2">
                      View All →
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {followUpLeads.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">No follow-ups scheduled</p>
                    </div>
                  ) : (
                    followUpLeads.map(lead => {
                      const followUpDate = new Date(lead.nextFollowUpDate!);
                      const isOverdue = isPast(followUpDate) && !isToday(followUpDate);
                      return (
                        <div key={lead.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 bg-mocha-100">
                              <AvatarFallback className="text-mocha-700 text-xs">
                                {lead.companyName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium truncate">
                                {lead.companyName}
                              </h5>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {lead.createdByName}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className={cn(
                              "flex items-center gap-1 text-xs",
                              isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                            )}>
                              <Clock className="w-3 h-3" />
                              {getDateLabel(followUpDate)}
                            </div>
                            <StatusBadge status={lead.status} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Folder Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Folder Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockFolderStats.map((folder) => (
                    <div key={folder.folderId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{folder.folderName}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">{folder.convertedLeads}/{folder.totalLeads}</span>
                          <span className="font-medium text-mocha-600">{folder.conversionRate.toFixed(1)}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={folder.conversionRate} 
                        className="h-2"
                        style={{
                          backgroundColor: 'hsl(var(--mocha-100))',
                        }}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* All Tasks Tab */}
        <TabsContent value="all-tasks" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {/* Filters */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={taskFilter.assignedTo} onValueChange={(v) => setTaskFilter(prev => ({ ...prev, assignedTo: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {mockUsers.filter(u => u.role === 'member').map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={taskFilter.status} onValueChange={(v) => setTaskFilter(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={taskFilter.priority} onValueChange={(v) => setTaskFilter(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tasks List */}
              <div>
                <h3 className="text-sm font-semibold mb-4">Tasks ({filteredTasks.length})</h3>
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No tasks found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.slice(0, 10).map(task => {
                    const isDone = task.status === 'done';
                    return (
                      <div key={task.id} className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
                          isDone ? "bg-green-100" : "bg-gray-100"
                        )}>
                          {isDone ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            "text-sm font-medium",
                            isDone && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.lead?.companyName || 'No lead'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              task.status === 'in_progress' && 'bg-blue-100 text-blue-700 border-blue-200',
                              task.status === 'todo' && 'bg-gray-100 text-gray-700 border-gray-200',
                              task.status === 'done' && 'bg-green-100 text-green-700 border-green-200'
                            )}
                          >
                            {task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Progress' : 'Done'}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              task.priority === 'high' && 'bg-red-50 text-red-700 border-red-200',
                              task.priority === 'medium' && 'bg-orange-50 text-orange-700 border-orange-200',
                              task.priority === 'low' && 'bg-gray-50 text-gray-600 border-gray-200'
                            )}
                          >
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </Badge>
                          <div className="flex items-center gap-1 min-w-[100px]">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{task.assignedUser?.name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[70px]">
                            <Calendar className="w-3 h-3" />
                            {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'No date'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Timeline Tab */}
        <TabsContent value="activity-timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Global Activity Timeline</CardTitle>
              <p className="text-sm text-muted-foreground">Recent actions across all leads</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    {index !== recentActivities.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-border" />
                    )}
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {getActivityIcon(activity.description)}
                      </div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm">
                        <span className="font-medium">{activity.actorName}</span>{' '}
                        <span className="text-muted-foreground">{activity.description}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mockLeads.find(l => l.id === activity.leadId)?.companyName || 'Al Rashid Trading LLC'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.createdAt), "MMM d, yyyy · HH:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Workload Tab */}
        <TabsContent value="team-workload" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...mockUsers.filter(u => u.role === 'admin'), ...teamPerformance.map(p => p.user)].map(user => {
              const isAdmin = user.role === 'admin';
              const perf = teamPerformance.find(p => p.user.id === user.id);
              const activeCount = perf?.activeCount || 0;
              const overdueCount = perf?.overdueCount || 0;
              const completedCount = perf?.completedCount || 0;
              const totalTasks = activeCount + overdueCount + completedCount;
              const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

              return (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="h-12 w-12 bg-mocha-100">
                        <AvatarFallback className="text-mocha-700 font-semibold">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <div className="text-xs text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{overdueCount}</div>
                        <div className="text-xs text-muted-foreground">Overdue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                        <div className="text-xs text-muted-foreground">Done</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-medium">{completionRate}%</span>
                      </div>
                      <Progress 
                        value={completionRate} 
                        className="h-2"
                        style={{
                          backgroundColor: 'hsl(var(--muted))',
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
