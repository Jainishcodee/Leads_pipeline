import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Loader2,
  UserIcon,
  Mail,
  Shield,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageCropModal } from '@/components/ui/image-crop-modal';
import { useAuth } from '@/auth/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinary';
import type { User } from '@/types';
import { format } from 'date-fns';
import { timestampToDate } from '@/lib/firestore';

// Function to normalize names (capitalize first letter, rest lowercase)
const normalizeName = (name: string): string => {
  if (!name.trim()) return '';
  return name
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, refreshProfile } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    avatar: '',
    phone: '',
  });
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  // Fetch user data from Firestore
  useEffect(() => {
    if (!authUser?.uid) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
          
          // Split name into first and last name
          const nameParts = (userData.name || '').trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setFormData({
            firstName,
            lastName,
            bio: userData.bio || '',
            avatar: userData.avatar || '',
            phone: userData.phone || '',
          });
          if (userData.avatar) {
            setPreviewAvatar(userData.avatar);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [authUser?.uid]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB max
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create preview URL and open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!authUser?.uid) return;

    try {
      setUploadingAvatar(true);
      
      // Create a File object from the blob
      const croppedFile = new File([croppedImageBlob], 'avatar.jpg', {
        type: 'image/jpeg',
      });

      // Upload to Cloudinary
      const result = await uploadToCloudinary(croppedFile, (progress) => {
        console.log('Upload progress:', progress);
      });
      
      setPreviewAvatar(result.secure_url);
      setFormData(prev => ({
        ...prev,
        avatar: result.secure_url,
      }));
      
      setCropModalOpen(false);
      setSelectedImageSrc(null);
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!authUser?.uid) return;

    try {
      setSaving(true);
      
      if (!formData.firstName.trim()) {
        toast.error('First name is required');
        return;
      }
      
      // Normalize first and last names
      const normalizedFirstName = normalizeName(formData.firstName);
      const normalizedLastName = normalizeName(formData.lastName);
      
      // Concatenate to create full name
      const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

      const userDocRef = doc(db, 'users', authUser.uid);
      await updateDoc(userDocRef, {
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        name: fullName,
        bio: formData.bio.trim(),
        avatar: formData.avatar,
        phone: formData.phone.trim(),
      });

      await refreshProfile();
      toast.success('Profile updated successfully');
      setUser(prev => prev ? { ...prev, name: fullName, bio: formData.bio, avatar: formData.avatar, phone: formData.phone } : null);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-mocha-600" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!authUser || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={() => navigate('/login')}>Return to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Profile Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Avatar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={previewAvatar || formData.avatar} />
                <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xl">
                  {`${formData.firstName} ${formData.lastName}`
                    .split(' ')
                    .map(n => n[0])
                    .filter(Boolean)
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                disabled={uploadingAvatar}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={uploadingAvatar}
                asChild
              >
                <span className="cursor-pointer flex items-center justify-center gap-2">
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Avatar
                    </>
                  )}
                </span>
              </Button>
            </label>
            
            <p className="text-xs text-muted-foreground text-center">
              Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
            </p>
          </CardContent>
        </Card>

        {/* Profile Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  firstName: e.target.value,
                }))}
                placeholder="Enter your first name"
                className="h-10"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  lastName: e.target.value,
                }))}
                placeholder="Enter your last name"
                className="h-10"
              />
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={authUser.email || ''}
                disabled
                className="h-10 bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Phone */}
            <PhoneInput
              id="phone"
              label="Phone Number"
              value={formData.phone}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
              placeholder="Enter phone number"
            />

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 200);
                  setFormData(prev => ({
                    ...prev,
                    bio: value,
                  }));
                }}
                placeholder="Tell us about yourself..."
                className="resize-none"
                rows={4}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/200 characters
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Role</span>
              <span className="text-sm capitalize px-2 py-1 bg-background rounded border border-border">
                {user.role}
              </span>
            </div>

            {/* Organization */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Organization ID</span>
              <span className="text-xs font-mono text-muted-foreground">
                {user.organizationId}
              </span>
            </div>

            {/* Member Since */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Member Since</span>
              </div>
              <span className="text-sm">
                {user.createdAt ? format(timestampToDate(user.createdAt), 'MMM d, yyyy') : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full">
              Sign Out
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You will be logged out of all devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Modal */}
      {selectedImageSrc && (
        <ImageCropModal
          open={cropModalOpen}
          onOpenChange={(open) => {
            setCropModalOpen(open);
            if (!open) {
              setSelectedImageSrc(null);
            }
          }}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          isUploading={uploadingAvatar}
        />
      )}
    </div>
  );
}
