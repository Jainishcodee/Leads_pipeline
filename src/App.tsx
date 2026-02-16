import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import FolderView from "@/pages/FolderView";
import LeadDetail from "@/pages/LeadDetail";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { ProtectedRoute, PublicOnlyRoute, AdminRoute, SuperAdminRoute } from "@/auth/ProtectedRoute";
import SuperAdminDashboard from "@/pages/SuperAdmin";
import { initializeCapacitor } from "@/lib/capacitor";

const queryClient = new QueryClient();

// Root route component that redirects based on user role
const RootRedirect = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (profile?.role === 'superadmin') {
        navigate('/super-admin', { replace: true });
      } else if (profile?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      setIsChecking(false);
    }
  }, [user, profile, loading, navigate]);

  if (isChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mocha-50 via-background to-gold-100">
        <div className="w-12 h-12 rounded-2xl gradient-mocha flex items-center justify-center shadow-lg animate-pulse">
          ☕
        </div>
      </div>
    );
  }

  return null;
};

const App = () => {
  // Initialize Capacitor plugins on app mount
  useEffect(() => {
    initializeCapacitor().catch((error) => {
      // Log but don't crash if initialization fails
      console.error("Failed to initialize Capacitor:", error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="folders/:folderId" element={<FolderView />} />
                  <Route path="leads/:leadId" element={<LeadDetail />} />
                  <Route path="team" element={<Team />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                </Route>
              </Route>
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/leads/:leadId" element={<LeadDetail />} />
                  <Route path="/admin/folders/:folderId" element={<FolderView />} />
                  <Route path="/admin/team" element={<Team />} />
                  <Route path="/admin/settings" element={<Settings />} />
                  <Route path="/admin/profile" element={<Profile />} />
                </Route>
              </Route>
              <Route element={<SuperAdminRoute />}>
                <Route path="/super-admin" element={<SuperAdminDashboard />} />
              </Route>
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
