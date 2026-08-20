import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { TaskStatus, LeadPriority, Lead } from '@/types';
import { leadsAPI, tasksAPI, assignmentsAPI, activitiesAPI, foldersAPI, notificationsAPI } from '@/lib/api';
import { isValidEmail } from '@/lib/validation';
import { useAuth } from '@/auth/AuthContext';
import { useFolders } from '@/hooks/useFirebaseData';
import { useUsers } from '@/hooks/useFirebaseData';

interface Subtask {
  id: string;
  title: string;
  assignedToId: string;
  status: 'pending' | 'completed';
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  dueDate: string;
  priority: LeadPriority;
  status: TaskStatus;
  subtasks: Subtask[];
  isExpanded: boolean;
}

interface CreateLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolderId?: string;
  editingLead?: Lead;
  onSuccess?: () => void;
}

export function CreateLeadModal({ open, onOpenChange, defaultFolderId, editingLead, onSuccess }: CreateLeadModalProps) {
  const { user, profile } = useAuth();
  const organizationId = profile?.organizationId || '';
  const { folders, loading: foldersLoading } = useFolders(organizationId);
  const { users, loading: usersLoading } = useUsers(organizationId);
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
    assignedRole: '',
  });
  
  const [tasks, setTasks] = useState<Task[]>(() => [
    {
      id: `temp_task_${Date.now()}`,
      title: '',
      description: '',
      assignedToId: '',
      dueDate: '',
      priority: 'medium' as LeadPriority,
      status: 'todo' as TaskStatus,
      subtasks: [],
      isExpanded: true,
    }
  ]);
  
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    userId: string;
    roleInLead: string;
  }>>([]);

  const [contactPersons, setContactPersons] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    whatsapp: string;
    sameAsPhone: boolean;
    role: string;
  }>>([
    {
      id: `contact_${Date.now()}`,
      name: '',
      phone: '',
      email: '',
      whatsapp: '',
      sameAsPhone: false,
      role: '',
    }
  ]);

  // Pre-fill form data when editing a lead
  useEffect(() => {
    if (editingLead && open) {
      setFormData({
        folderId: editingLead.folderId || defaultFolderId || '',
        companyName: editingLead.companyName || '',
        location: editingLead.location || '',
        whatsappNumber: editingLead.whatsappNumber || '',
        emailId: editingLead.emailId || '',
        interest: editingLead.interest.join(', ') || '',
        reference: editingLead.reference || '',
        completeAddress: editingLead.completeAddress || '',
        managerName: editingLead.managerName || '',
        managerPhone: editingLead.managerPhone || '',
        managerEmail: editingLead.managerEmail || '',
        managerWhatsapp: editingLead.managerWhatsapp || '',
        priority: editingLead.priority || 'medium',
        notes: editingLead.notes || '',
        assignedTo: '',
        assignedRole: '',
      });
      
      // Load contact persons if available, otherwise create from legacy manager fields
      if (editingLead.contactPersons && editingLead.contactPersons.length > 0) {
        setContactPersons(editingLead.contactPersons.map(contact => ({
          ...contact,
          sameAsPhone: contact.phone === contact.whatsapp && contact.phone !== '',
          role: contact.role || '',
        })));
      } else if (editingLead.managerName || editingLead.managerPhone || editingLead.managerEmail) {
        // Migrate legacy data
        setContactPersons([{
          id: `contact_${Date.now()}`,
          name: editingLead.managerName || '',
          phone: editingLead.managerPhone || '',
          email: editingLead.managerEmail || '',
          whatsapp: editingLead.managerWhatsapp || '',
          sameAsPhone: editingLead.managerPhone === editingLead.managerWhatsapp && editingLead.managerPhone !== '',
          role: '',
        }]);
      }
      
      setStep(1);
    } else if (open && !editingLead) {
      // Reset form for new lead
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
        assignedRole: '',
      });
      setContactPersons([{
        id: `contact_${Date.now()}`,
        name: '',
        phone: '',
        email: '',
        whatsapp: '',
        sameAsPhone: false,
        role: '',
      }]);
    }
  }, [editingLead, open, defaultFolderId]);

  const usersById = new Map(users.map((member) => [member.id, member]));
  const teamOptions = users;

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTask = () => {
    const newTask: Task = {
      id: `temp_task_${Date.now()}`,
      title: '',
      description: '',
      assignedToId: '',
      dueDate: '',
      priority: 'medium' as LeadPriority,
      status: 'todo' as TaskStatus,
      subtasks: [],
      isExpanded: true,
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

  const toggleTaskExpanded = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, isExpanded: !task.isExpanded } : task
    ));
  };

  const addSubtask = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: [
            ...task.subtasks,
            {
              id: `subtask_${Date.now()}`,
              title: '',
              assignedToId: '',
              status: 'pending' as const,
            }
          ]
        };
      }
      return task;
    }));
  };

  const updateSubtask = (taskId: string, subtaskId: string, field: string, value: any) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.map(subtask =>
            subtask.id === subtaskId ? { ...subtask, [field]: value } : subtask
          )
        };
      }
      return task;
    }));
  };

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subtasks: task.subtasks.filter(subtask => subtask.id !== subtaskId)
        };
      }
      return task;
    }));
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

  // Contact person management
  const addContactPerson = () => {
    const newContact = {
      id: `contact_${Date.now()}`,
      name: '',
      phone: '',
      email: '',
      whatsapp: '',
      sameAsPhone: false,
      role: '',
    };
    setContactPersons([...contactPersons, newContact]);
  };

  const updateContactPerson = (contactId: string, field: string, value: any) => {
    setContactPersons(contactPersons.map(contact => {
      if (contact.id === contactId) {
        const updated = { ...contact, [field]: value };
        // If phone changes and sameAsPhone is true, update whatsapp
        if (field === 'phone' && contact.sameAsPhone) {
          updated.whatsapp = value;
        }
        // If whatsapp changes to different value, uncheck sameAsPhone
        if (field === 'whatsapp' && value !== contact.phone) {
          updated.sameAsPhone = false;
        }
        // If sameAsPhone is checked, copy phone to whatsapp
        if (field === 'sameAsPhone' && value === true) {
          updated.whatsapp = contact.phone;
        }
        return updated;
      }
      return contact;
    }));
  };

  const removeContactPerson = (contactId: string) => {
    if (contactPersons.length > 1) {
      setContactPersons(contactPersons.filter(contact => contact.id !== contactId));
    } else {
      toast.error('At least one contact person is required');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!organizationId) {
      toast.error('You are not linked to an organization. Please contact an admin.');
      return;
    }

    if (!formData.companyName || !formData.folderId) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email formats (company email + any contact emails that were filled in)
    if (formData.emailId.trim() && !isValidEmail(formData.emailId)) {
      toast.error('Please enter a valid company email address');
      return;
    }

    const invalidContact = contactPersons.find(
      (contact) => contact.email.trim() && !isValidEmail(contact.email)
    );
    if (invalidContact) {
      toast.error(`Please enter a valid email for ${invalidContact.name || 'the contact person'}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get folder info
      const folder = folders.find(f => f.id === formData.folderId);
      
      // Sanitize contact persons
      const sanitizedContacts = contactPersons
        .filter(contact => contact.name || contact.phone || contact.email) // Only include non-empty contacts
        .map(contact => ({
          id: contact.id,
          name: DOMPurify.sanitize(contact.name, { ALLOWED_TAGS: [] }),
          phone: DOMPurify.sanitize(contact.phone, { ALLOWED_TAGS: [] }),
          email: DOMPurify.sanitize(contact.email, { ALLOWED_TAGS: [] }),
          whatsapp: DOMPurify.sanitize(contact.whatsapp, { ALLOWED_TAGS: [] }),
          role: DOMPurify.sanitize(contact.role, { ALLOWED_TAGS: [] }),
        }));

      // Use first contact for legacy fields (backward compatibility)
      const firstContact = sanitizedContacts[0] || { name: '', phone: '', email: '', whatsapp: '' };
      
      // Sanitize common fields
      const sanitizedData = {
        companyName: DOMPurify.sanitize(formData.companyName, { ALLOWED_TAGS: [] }),
        location: DOMPurify.sanitize(formData.location, { ALLOWED_TAGS: [] }),
        whatsappNumber: DOMPurify.sanitize(formData.whatsappNumber, { ALLOWED_TAGS: [] }),
        emailId: DOMPurify.sanitize(formData.emailId, { ALLOWED_TAGS: [] }),
        interest: formData.interest ? formData.interest.split(',').map(i => DOMPurify.sanitize(i.trim(), { ALLOWED_TAGS: [] })) : [],
        reference: formData.reference ? DOMPurify.sanitize(formData.reference, { ALLOWED_TAGS: [] }) : null,
        completeAddress: DOMPurify.sanitize(formData.completeAddress, { ALLOWED_TAGS: [] }),
        // Legacy fields from first contact
        managerName: firstContact.name,
        managerPhone: firstContact.phone,
        managerEmail: firstContact.email,
        managerWhatsapp: firstContact.whatsapp,
        // Contact persons array
        contactPersons: sanitizedContacts,
        notes: formData.notes ? DOMPurify.sanitize(formData.notes, { ALLOWED_TAGS: [] }) : null,
      };

      if (editingLead) {
        // UPDATE MODE: Update existing lead
        const leadData: Partial<Lead> = {
          ...sanitizedData,
          priority: formData.priority as 'low' | 'medium' | 'high',
        };
        
        await leadsAPI.update(editingLead.id, leadData);
        
        // Log edit activity
        await activitiesAPI.logActivity(
          editingLead.id,
          user.uid,
          user.email?.split('@')[0] || 'User',
          'lead_edited',
          `Edited lead ${sanitizedData.companyName}`,
          organizationId,
          { companyName: sanitizedData.companyName }
        );
        
        toast.success('Lead updated successfully!');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        // CREATE MODE: Create new lead
        const leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'lastActivityAt'> = {
          ...sanitizedData,
          status: 'new',
          priority: formData.priority as 'low' | 'medium' | 'high',
          valueEstimate: null,
          nextFollowUpDate: null,
          tags: [],
          folderId: formData.folderId,
          folderName: folder?.name || '',
          organizationId,
          createdById: user.uid,
          createdByName: user.email?.split('@')[0] || 'Unknown',
          convertedAt: null,
          cancelledAt: null,
          cancellationReason: null,
          duplicateOfLeadId: null,
        };

        const leadId = await leadsAPI.create(leadData);
        
        // Create tasks
        for (const task of tasks.filter(t => t.title)) {
          const assignedUser = usersById.get(task.assignedToId || '') || null;
          await tasksAPI.create({
            leadId,
            organizationId,
            assignedToId: task.assignedToId || user.uid,
            assignedToName: assignedUser?.name || user.email?.split('@')[0] || 'Unassigned',
            createdById: user.uid,
            createdByName: user.email?.split('@')[0] || 'User',
            title: DOMPurify.sanitize(task.title, { ALLOWED_TAGS: [] }),
            description: task.description ? DOMPurify.sanitize(task.description, { ALLOWED_TAGS: [] }) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            status: task.status,
            priority: task.priority,
            checklist: task.subtasks.map(st => ({
              id: st.id,
              text: DOMPurify.sanitize(st.title, { ALLOWED_TAGS: [] }),
              completed: st.status === 'completed'
            })),
          });
          
          // Notify the assignee about the new task
          if (task.assignedToId && task.assignedToId !== user.uid) {
            await notificationsAPI.create({
              userId: task.assignedToId,
              organizationId,
              type: 'task',
              title: 'New Task Assigned',
              message: `${user.email?.split('@')[0] || 'Someone'} assigned you a task: "${task.title}"`,
              leadId,
              read: false,
            });
          }
        }
        
        // Create team assignments
        for (const member of teamMembers) {
          const memberUser = usersById.get(member.userId);
          await assignmentsAPI.create({
            leadId,
            organizationId,
            userId: member.userId,
            userName: memberUser?.name || 'Unknown',
            roleInLead: DOMPurify.sanitize(member.roleInLead, { ALLOWED_TAGS: [] }),
            createdAt: new Date(),
          });
          
          // Notify the assigned team member
          if (member.userId !== user.uid) {
            await notificationsAPI.create({
              userId: member.userId,
              organizationId,
              type: 'lead',
              title: 'Added to Lead',
              message: `${user.email?.split('@')[0] || 'Someone'} added you to lead: "${sanitizedData.companyName}"`,
              leadId,
              read: false,
            });
          }
        }
        
        // Log activity
        await activitiesAPI.logActivity(
          leadId,
          user.uid,
          user.email?.split('@')[0] || 'User',
          'lead_created',
          `Created lead ${sanitizedData.companyName}`,
          organizationId,
          { companyName: sanitizedData.companyName }
        );
        
        // Increment folder lead count
        await foldersAPI.incrementLeadCount(formData.folderId);
        
        toast.success(`Lead created successfully with ${tasks.length} task(s) and ${teamMembers.length} team member(s)!`);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
      
      // Reset form
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
        assignedRole: '',
      });
      setTasks([]);
      setTeamMembers([]);
      
      // Refresh the page to show updated lead
      if (!editingLead) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error(`Failed to ${editingLead ? 'update' : 'create'} lead. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editingLead ? 'Edit Lead' : 'Create New Lead'}
          </DialogTitle>
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
                        {foldersLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading folders...
                          </SelectItem>
                        ) : (
                          folders.map(folder => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))
                        )}
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
              
              {/* Contact Persons Section */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Contact Persons</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContactPerson}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>

                {contactPersons.map((contact, index) => (
                  <Card key={contact.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Contact Person {index + 1}</h4>
                        {contactPersons.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeContactPerson(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Name and Email on same row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`contact-name-${contact.id}`} className="text-xs font-medium">Name *</Label>
                          <Input
                            id={`contact-name-${contact.id}`}
                            value={contact.name}
                            onChange={(e) => updateContactPerson(contact.id, 'name', e.target.value)}
                            placeholder="Ahmed Al Rashid"
                            className="input-mocha h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`contact-email-${contact.id}`} className="text-xs font-medium">Email *</Label>
                          <Input
                            id={`contact-email-${contact.id}`}
                            type="email"
                            value={contact.email}
                            onChange={(e) => updateContactPerson(contact.id, 'email', e.target.value)}
                            placeholder="ahmed@company.com"
                            className="input-mocha h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Role, Phone, WhatsApp */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`contact-role-${contact.id}`} className="text-xs font-medium">Role *</Label>
                          <Select value={contact.role} onValueChange={(value) => updateContactPerson(contact.id, 'role', value)}>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="senior-employee">Senior Employee</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <PhoneInput
                          id={`contact-phone-${contact.id}`}
                          label="Phone"
                          value={contact.phone}
                          onChange={(value) => updateContactPerson(contact.id, 'phone', value)}
                          required
                          className="space-y-1 w-full"
                        />
                        <div>
                          <PhoneInput
                            id={`contact-whatsapp-${contact.id}`}
                            label="WhatsApp"
                            value={contact.whatsapp}
                            onChange={(value) => updateContactPerson(contact.id, 'whatsapp', value)}
                            placeholder="Same as phone or different"
                            disabled={contact.sameAsPhone}
                            className="space-y-1 w-full"
                          />
                          <div className="flex items-center space-x-2 mt-1.5">
                            <Checkbox
                              id={`sameAsPhone-${contact.id}`}
                              checked={contact.sameAsPhone}
                              onCheckedChange={(checked) => updateContactPerson(contact.id, 'sameAsPhone', checked)}
                            />
                            <Label htmlFor={`sameAsPhone-${contact.id}`} className="text-xs font-normal cursor-pointer">
                              Same as phone
                            </Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
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
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Select value={formData.assignedTo} onValueChange={(v) => updateField('assignedTo', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {usersLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading team...
                            </SelectItem>
                          ) : (
                            teamOptions.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name} ({member.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Input
                        value={formData.assignedRole}
                        onChange={(e) => updateField('assignedRole', e.target.value)}
                        placeholder="Role (e.g., Welcome Mail, Samples)"
                        className="input-mocha"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tasks Section */}
              <div className="border-t pt-6 space-y-4">
                <div>
                  <h3 className="font-medium text-muted-foreground">Tasks</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add tasks for this lead. Create multiple independent tasks or add subtasks within a task.</p>
                </div>

                <div className="space-y-3">
                  {tasks.map((task, index) => (
                    <Card key={task.id} className="border-mocha-200">
                      <CardContent className="p-4 space-y-3">
                        {/* Task Header */}
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="mt-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {task.isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <Input
                            placeholder="Task title *"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                            Task {index + 1}
                          </span>
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

                        {/* Task Details (Expandable) */}
                        {task.isExpanded && (
                          <div className="space-y-3 pl-6 border-l-2 border-mocha-200">
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
                                    {usersLoading ? (
                                      <SelectItem value="loading" disabled>
                                        Loading team...
                                      </SelectItem>
                                    ) : (
                                      teamOptions.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                          {member.name} ({member.email})
                                        </SelectItem>
                                      ))
                                    )}
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

                            {/* Subtasks Section */}
                            <div className="space-y-2 pt-2 border-t border-mocha-100">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-medium text-muted-foreground">Subtasks ({task.subtasks.length})</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addSubtask(task.id)}
                                  className="h-7 px-2 text-xs gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add
                                </Button>
                              </div>

                              {task.subtasks.length > 0 && (
                                <div className="space-y-2 bg-muted/30 rounded p-2">
                                  {task.subtasks.map((subtask) => (
                                    <div key={subtask.id} className="flex items-start gap-2 bg-white rounded p-2">
                                      <button
                                        type="button"
                                        onClick={() => updateSubtask(task.id, subtask.id, 'status', subtask.status === 'completed' ? 'pending' : 'completed')}
                                        className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        {subtask.status === 'completed' ? (
                                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <Circle className="w-4 h-4" />
                                        )}
                                      </button>
                                      <Input
                                        placeholder="Subtask title"
                                        value={subtask.title}
                                        onChange={(e) => updateSubtask(task.id, subtask.id, 'title', e.target.value)}
                                        className="flex-1 h-8 text-sm"
                                      />
                                      <Select
                                        value={subtask.assignedToId}
                                        onValueChange={(v) => updateSubtask(task.id, subtask.id, 'assignedToId', v)}
                                      >
                                        <SelectTrigger className="h-8 w-32 text-sm">
                                          <SelectValue placeholder="Assign" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {usersLoading ? (
                                            <SelectItem value="loading" disabled>
                                              Loading team...
                                            </SelectItem>
                                          ) : (
                                            teamOptions.map((member) => (
                                              <SelectItem key={member.id} value={member.id}>
                                                {member.name} ({member.email})
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSubtask(task.id, subtask.id)}
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Add Task Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={addTask}
                    className="btn-mocha gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Task
                  </Button>
                </div>
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
                {isSubmitting ? (editingLead ? 'Saving...' : 'Creating...') : (editingLead ? 'Save' : 'Create Lead')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
