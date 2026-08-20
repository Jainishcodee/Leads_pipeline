import { useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/auth/AuthContext';
import { AddTeamMemberModal } from '@/components/admin/AddTeamMemberModal';
import Dashboard from './Dashboard';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);

  if (!organizationId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No organization assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">An admin must be linked to an organization before accessing the dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Admin Controls Bar */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor leads, tasks, and team activity</p>
          </div>
          <Button onClick={() => setAddTeamMemberOpen(true)}>
            <Users className="w-4 h-4 mr-2" />
            Manage Team
          </Button>
        </div>
      </div>

      {/* Shared Dashboard View */}
      <Dashboard />

      {/* Modals */}
      <AddTeamMemberModal
        open={addTeamMemberOpen}
        onOpenChange={setAddTeamMemberOpen}
        availableUsers={[]}
        currentTeamMembers={[]}
        organizationId={organizationId}
        onSuccess={() => {
          setAddTeamMemberOpen(false);
        }}
      />
    </div>
  );
}
