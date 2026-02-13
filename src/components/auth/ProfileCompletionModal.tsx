import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

interface ProfileCompletionModalProps {
  user: User;
  authUserId: string;
  onComplete: () => void;
}

export function ProfileCompletionModal({ user, authUserId, onComplete }: ProfileCompletionModalProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
  });

  useEffect(() => {
    // Only check once when component mounts
    if (hasChecked) return;
    
    // Check if we've already shown this modal in this session
    const modalShownKey = `profile-completion-shown-${authUserId}`;
    const hasShownBefore = sessionStorage.getItem(modalShownKey);
    
    if (hasShownBefore) {
      setHasChecked(true);
      return;
    }

    // Check if profile is incomplete AND user was created recently (within last 24 hours)
    const isIncomplete = !user.name || !user.phone;
    const userCreatedAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isNewUser = userCreatedAt > oneDayAgo;
    
    // Only show for new users with incomplete profiles
    if (isIncomplete && isNewUser) {
      setOpen(true);
      sessionStorage.setItem(modalShownKey, 'true');
    }
    
    setHasChecked(true);
  }, [user, authUserId, hasChecked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setSaving(true);
      const userDocRef = doc(db, 'users', authUserId);
      await updateDoc(userDocRef, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      });

      toast.success('Profile completed successfully');
      setOpen(false);
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide your name and phone number to continue using the application.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <PhoneInput
              id="phone"
              label="Phone Number"
              value={formData.phone}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
              placeholder="Enter phone number"
              required
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Profile'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
