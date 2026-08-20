import { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  FolderOpen, 
  Tags, 
  FileText,
  Download,
  Upload,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '@/auth/AuthContext';
import { useFirestoreDoc } from '@/lib/useFirestore';
import { updateDocument } from '@/lib/firestore';
import type { Organization } from '@/types';

export default function Settings() {
  const { profile } = useAuth();
  const organizationId = profile?.organizationId || null;
  const { data: organization } = useFirestoreDoc<Organization>('organizations', organizationId, { listen: true });
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (organization?.name) {
      setOrgName(organization.name);
    }
  }, [organization?.name]);

  const handleSave = () => {
    if (!organizationId) {
      toast.error('No organization linked');
      return;
    }
    if (!orgName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    updateDocument('organizations', organizationId, { name: orgName.trim() })
      .then(() => toast.success('Settings saved successfully'))
      .catch(() => toast.error('Failed to save settings'));
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings
        </p>
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="organization" className="gap-1.5">
            <Building2 className="w-4 h-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="w-4 h-4" />
            Users & Roles
          </TabsTrigger>
          
          <TabsTrigger value="templates" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="w-4 h-4" />
            Import/Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <div className="card-premium p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="input-mocha max-w-md"
                />
              </div>

              <div className="space-y-2">
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-mocha-100 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-mocha-500" />
                  </div>
                  <Button variant="outline">Upload Logo</Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button className="btn-mocha" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1.5" />
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="card-premium p-6">
            <h3 className="font-semibold mb-4">Role Permissions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-sm text-muted-foreground">Full access to all features</p>
                </div>
                  <Badge variant="outline">Full Access</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">Member</p>
                  <p className="text-sm text-muted-foreground">Create and manage leads within permitted folders</p>
                </div>
                <Badge variant="outline">Standard</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="font-medium">Observer</p>
                  <p className="text-sm text-muted-foreground">View-only access to assigned leads</p>
                </div>
                <Badge variant="outline">Read Only</Badge>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow observers to chat</p>
                  <p className="text-sm text-muted-foreground">Let observers participate in lead chats</p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="folders" className="mt-6">
          <div className="card-premium p-6">
            <h3 className="font-semibold mb-4">Default Folder Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-assign on creation</p>
                  <p className="text-sm text-muted-foreground">Automatically assign the creator to new leads</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable duplicate detection</p>
                  <p className="text-sm text-muted-foreground">Check for duplicates when creating leads</p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Task Templates</h3>
              <Button className="btn-mocha">
                Create Template
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="p-4 border border-border rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Event Lead Standard</p>
                    <p className="text-sm text-muted-foreground">5 tasks • Created for exhibition leads</p>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <div className="p-4 border border-border rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Quick Follow-up</p>
                    <p className="text-sm text-muted-foreground">2 tasks • For inbound inquiries</p>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <div className="space-y-6">
            <div className="card-premium p-6">
              <h3 className="font-semibold mb-4">Export Data</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-1.5">
                  <Download className="w-4 h-4" />
                  Export All Leads (CSV)
                </Button>
                <Button variant="outline" className="gap-1.5">
                  <Download className="w-4 h-4" />
                  Export Dashboard Summary
                </Button>
              </div>
            </div>

            <div className="card-premium p-6">
              <h3 className="font-semibold mb-4">Import Data</h3>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="mt-3 text-muted-foreground">
                  Drag and drop a CSV file, or click to browse
                </p>
                <Button variant="outline" className="mt-4">
                  Select File
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground ${className}`}>
      {children}
    </span>
  );
}
