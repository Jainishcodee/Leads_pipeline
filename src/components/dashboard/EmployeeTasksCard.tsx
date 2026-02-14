import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useOrganizationTasks, useUsers } from '@/hooks/useFirebaseData';
import { Loader } from 'lucide-react';
import type { Task, User } from '@/types';

interface EmployeeTaskStats {
  employee: User;
  pendingTasks: number;
  ongoingTasks: number;
  completedTasks: number;
  totalTasks: number;
  efficiencyPercentage: number;
}

interface EmployeeTasksCardProps {
  organizationId: string;
}

export function EmployeeTasksCard({ organizationId }: EmployeeTasksCardProps) {
  const { tasks, loading: tasksLoading } = useOrganizationTasks(organizationId);
  const { users, loading: usersLoading } = useUsers(organizationId);

  const employeeTaskStats = useMemo(() => {
    if (!tasks || !users) return [];

    // Group tasks by assignedToId
    const tasksByUser = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!tasksByUser.has(task.assignedToId)) {
        tasksByUser.set(task.assignedToId, []);
      }
      tasksByUser.get(task.assignedToId)!.push(task);
    });

    // Calculate stats for each user - members only
    const stats: EmployeeTaskStats[] = users
      .filter(user => user.role === 'member') // Only show members, not admins
      .map((user) => {
        const userTasks = tasksByUser.get(user.id) || [];
        const pendingTasks = userTasks.filter((t) => t.status === 'todo').length;
        const ongoingTasks = userTasks.filter((t) => t.status === 'in_progress').length;
        const completedTasks = userTasks.filter((t) => t.status === 'done').length;
        const totalTasks = userTasks.length;

        // Efficiency = (Completed + Ongoing) / Total * 100
        // If no tasks, efficiency is 0%
        const efficiencyPercentage = totalTasks > 0 
          ? Math.round(((completedTasks + ongoingTasks) / totalTasks) * 100) 
          : 0;

        return {
          employee: user,
          pendingTasks,
          ongoingTasks,
          completedTasks,
          totalTasks,
          efficiencyPercentage,
        };
      })
      .sort((a, b) => b.efficiencyPercentage - a.efficiencyPercentage); // Sort by efficiency descending

    return stats;
  }, [tasks, users]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getEfficiencyColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (tasksLoading || usersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Task Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (employeeTaskStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Employee Task Overview</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No members added to this organization yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Task Overview</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Task distribution and efficiency across the team
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="text-center font-semibold">Pending</TableHead>
                <TableHead className="text-center font-semibold">Ongoing</TableHead>
                <TableHead className="text-center font-semibold">Completed</TableHead>
                <TableHead className="text-center font-semibold">Total Tasks</TableHead>
                <TableHead className="text-center font-semibold">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeTaskStats.slice(0, 3).map((stat) => (
                <TableRow key={stat.employee.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(stat.employee.name || stat.employee.firstName || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {stat.employee.firstName || stat.employee.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stat.employee.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-50 text-red-600 text-sm font-medium">
                      {stat.pendingTasks}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                      {stat.ongoingTasks}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-50 text-green-600 text-sm font-medium">
                      {stat.completedTasks}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-sm">{stat.totalTasks}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getEfficiencyColor(stat.efficiencyPercentage)}`}>
                      {stat.efficiencyPercentage}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {employeeTaskStats.length > 3 && (
            <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/30">
              +{employeeTaskStats.length - 3} more employees
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
