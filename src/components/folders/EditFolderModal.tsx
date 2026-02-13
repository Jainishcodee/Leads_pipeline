import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { foldersAPI } from '@/lib/api';
import { toast } from 'sonner';
import { timestampToDate } from '@/lib/firestore';
import type { Folder } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EditFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder;
  onSuccess?: () => void;
}

export function EditFolderModal({ open, onOpenChange, folder, onSuccess }: EditFolderModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventStartDate: '',
    eventEndDate: '',
    venue: '',
  });

  useEffect(() => {
    if (folder) {
      const formatDateForInput = (date: any): string => {
        if (!date) return '';
        try {
          const dateObj = date instanceof Date ? date : timestampToDate(date);
          return dateObj.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      setFormData({
        name: folder.name,
        description: folder.description || '',
        eventStartDate: formatDateForInput(folder.eventStartDate),
        eventEndDate: formatDateForInput(folder.eventEndDate),
        venue: folder.venue || '',
      });
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      setLoading(true);

      const updateData: Partial<Folder> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        eventStartDate: formData.eventStartDate ? new Date(formData.eventStartDate) : undefined,
        eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate) : undefined,
        venue: formData.venue.trim() || undefined,
      };

      await foldersAPI.update(folder.id, updateData);
      
      toast.success('Folder updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                name: e.target.value,
              }))}
              placeholder="e.g., Q1 2024 Trade Shows"
              className="h-10"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: e.target.value,
              }))}
              placeholder="Optional folder description"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Event Start Date */}
          <div className="space-y-2">
            <Label htmlFor="eventStartDate">Event Start Date</Label>
            <Input
              id="eventStartDate"
              type="date"
              value={formData.eventStartDate}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                eventStartDate: e.target.value,
              }))}
              className="h-10"
            />
          </div>

          {/* Event End Date */}
          <div className="space-y-2">
            <Label htmlFor="eventEndDate">Event End Date</Label>
            <Input
              id="eventEndDate"
              type="date"
              value={formData.eventEndDate}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                eventEndDate: e.target.value,
              }))}
              className="h-10"
            />
          </div>

          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                venue: e.target.value,
              }))}
              placeholder="Event venue location"
              className="h-10"
            />
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
