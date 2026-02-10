import { useState } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockFolders, mockUsers } from '@/data/mockData';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { TaskStatus, LeadPriority } from '@/types';

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolderId?: string;
}

export function CreateLeadModal({ open, onOpenChange, defaultFolderId }: CreateLeadModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    folderId: defaultFolderId || '',
    companyName: '',
    location: '',
    whatsappNumber: '',
    emailId: '',
    interest: '',
    reference: '',
    completeAddress: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    managerWhatsapp: '',
    priority: 'medium',
    notes: '',
    assignedTo: '',
  });
  
  const [tasks, setTasks] = useState<Array<{
    id: string;
    title: string;
    description: string;
    assignedToId: string;
    dueDate: string;
    priority: LeadPriority;
    status: TaskStatus;
  }>>([]);
  
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    userId: string;
    roleInLead: string;
  }>>([]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTask = () => {
    const newTask = {
      id: `temp_task_${Date.now()}`,
      title: '',
      description: '',
      assignedToId: '',
      dueDate: '',
      priority: 'medium' as LeadPriority,
      status: 'todo' as TaskStatus,
    };
    setTasks([...tasks, newTask]);
  };
  
  const updateTask = (taskId: string, field: string, value: any) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, [field]: value } : task
    ));
  };
  
  const removeTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  const addTeamMember = () => {
    const newMember = {
      id: `temp_member_${Date.now()}`,
      userId: '',
      roleInLead: '',
    };
    setTeamMembers([...teamMembers, newMember]);
  };
  
  const updateTeamMember = (memberId: string, field: string, value: string) => {
    setTeamMembers(teamMembers.map(member => 
      member.id === memberId ? { ...member, [field]: value } : member
    ));
  };
  
  const removeTeamMember = (memberId: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== memberId));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    
    // Log what's being created
    console.log('Creating lead with:', { formData, tasks, teamMembers });
    
    toast.success(`Lead created successfully with ${tasks.length} task(s) and ${teamMembers.length} team member(s)!`);
    onOpenChange(false);
    setStep(1);
    setFormData({
      folderId: defaultFolderId || '',
      companyName: '',
      location: '',
      whatsappNumber: '',
      emailId: '',
      interest: '',
      reference: '',
      completeAddress: '',
      managerName: '',
      managerPhone: '',
      managerEmail: '',
      managerWhatsapp: '',
      priority: 'medium',
      notes: '',
      assignedTo: '',
    });
    setTasks([]);
    setTeamMembers([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 4 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Company Information</h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder">Folder *</Label>
                    <Select value={formData.folderId} onValueChange={(v) => updateField('folderId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockFolders.map(folder => (
                          <SelectItem key={folder.id} value={folder.id}>
                            {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => updateField('companyName', e.target.value)}
                        placeholder="e.g., Al Rashid Trading LLC"
                        className="input-mocha"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        placeholder="e.g., Dubai, UAE"
                        className="input-mocha"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="completeAddress">Complete Address</Label>
                    <Textarea
                      id="completeAddress"
                      value={formData.completeAddress}
                      onChange={(e) => updateField('completeAddress', e.target.value)}
                      placeholder="Full address with postal code"
                      className="input-mocha min-h-[80px]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailId">Company Email *</Label>
                      <Input
                        id="emailId"
                        type="email"
                        value={formData.emailId}
                        onChange={(e) => updateField('emailId', e.target.value)}
                        placeholder="imports@company.com"
                        className="input-mocha"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber">WhatsApp Number *</Label>
                      <Input
                        id="whatsappNumber"
                        value={formData.whatsappNumber}
                        onChange={(e) => updateField('whatsappNumber', e.target.value)}
                        placeholder="+971501234567"
                        className="input-mocha"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-medium text-muted-foreground">Manager / Contact Person</h3>
              
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerName">Manager Name *</Label>
                    <Input
                      id="managerName"
                      value={formData.managerName}
                      onChange={(e) => updateField('managerName', e.target.value)}
                      placeholder="e.g., Ahmed Al Rashid"
                      className="input-mocha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managerEmail">Manager Email *</Label>
                    <Input
                      id="managerEmail"
                      type="email"
                      value={formData.managerEmail}
                      onChange={(e) => updateField('managerEmail', e.target.value)}
                      placeholder="ahmed@company.com"
                      className="input-mocha"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="managerPhone">Manager Phone *</Label>
                    <Input
                      id="managerPhone"
                      value={formData.managerPhone}
                      onChange={(e) => updateField('managerPhone', e.target.value)}
                      placeholder="+971501234567"
                      className="input-mocha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="managerWhatsapp">Manager WhatsApp</Label>
                    <Input
                      id="managerWhatsapp"
                      value={formData.managerWhatsapp}
                      onChange={(e) => updateField('managerWhatsapp', e.target.value)}
                      placeholder="Same as phone or different"
                      className="input-mocha"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (if any)</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => updateField('reference', e.target.value)}
                    placeholder="e.g., Gulf Food Exhibition, Distributor referral"
                    className="input-mocha"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="font-medium text-muted-foreground">Interest & Priority</h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interest">Products/Services Interested In *</Label>
                  <Textarea
                    id="interest"
                    value={formData.interest}
                    onChange={(e) => updateField('interest', e.target.value)}
                    placeholder="e.g., Spices, Ready-to-Eat, Pickles, Sauces"
                    className="input-mocha min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Initial Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Any additional notes about this lead..."
                    className="input-mocha min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Assign Lead & Tasks</h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedTo">Assign to Team Member</Label>
                    <Select value={formData.assignedTo} onValueChange={(v) => updateField('assignedTo', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockUsers.filter(user => user.role === 'member').map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                            </div>
                </div>
              </div>

              {/* Tasks Section */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-muted-foreground">Tasks </h3>
                    <p className="text-sm text-muted-foreground mt-1">Add initial tasks for this lead</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTask}
                    className="gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </Button>
                </div>

                {tasks.length > 0 && (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <Card key={task.id} className="border-mocha-200">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <Input
                              placeholder="Task title *"
                              value={task.title}
                              onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTask(task.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Textarea
                            placeholder="Task description"
                            value={task.description}
                            onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                            className="min-h-[60px]"
                          />
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Assign To</Label>
                              <Select
                                value={task.assignedToId}
                                onValueChange={(v) => updateTask(task.id, 'assignedToId', v)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {mockUsers.filter(u => u.role === 'member').map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Priority</Label>
                              <Select
                                value={task.priority}
                                onValueChange={(v) => updateTask(task.id, 'priority', v)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Due Date</Label>
                              <Input
                                type="date"
                                value={task.dueDate}
                                onChange={(e) => updateTask(task.id, 'dueDate', e.target.value)}
                                className="h-9"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Team Members Section */}
              <div className="border-t pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-muted-foreground">Team Members </h3>
                    <p className="text-sm text-muted-foreground mt-1">Assign team members to this lead</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTeamMember}
                    className="gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Member
                  </Button>
                </div>

                {teamMembers.length > 0 && (
                  <div className="space-y-3">
                    {teamMembers.map((member) => {
                      const user = mockUsers.find(u => u.id === member.userId);
                      return (
                        <Card key={member.id} className="border-mocha-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              {user && (
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-mocha-100 text-mocha-700 text-sm">
                                    {user.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className="flex-1 grid sm:grid-cols-2 gap-3">
                                <Select
                                  value={member.userId}
                                  onValueChange={(v) => updateTeamMember(member.id, 'userId', v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select team member" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {mockUsers.filter(u => u.role === 'member').map(user => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.name} ({user.role})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Role (e.g., Welcome Mail, Samples)"
                                  value={member.roleInLead}
                                  onChange={(e) => updateTeamMember(member.id, 'roleInLead', e.target.value)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTeamMember(member.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Step {step} of 4
          </div>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button 
                className="btn-mocha"
                onClick={() => setStep(step + 1)}
              >
                Next
              </Button>
            ) : (
              <Button 
                className="btn-mocha"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Lead'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
