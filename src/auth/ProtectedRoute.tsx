import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Coffee } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const ADMIN_EMAIL = 'jainishshah356@gmail.com';

const AuthLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mocha-50 via-background to-gold-100">
    <div className="flex flex-col items-center gap-3 text-muted-foreground animate-pulse-soft">
      <div className="w-12 h-12 rounded-2xl gradient-mocha flex items-center justify-center shadow-lg">
        <Coffee className="w-6 h-6 text-primary-foreground" />
      </div>
      <p className="text-sm">Brewing your workspace...</p>
    </div>
  </div>
);

export function ProtectedRoute({ redirectTo = "/login" }: { redirectTo?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Redirect admin users to admin dashboard
  if (user.email === ADMIN_EMAIL) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

export function AdminRoute({ redirectTo = "/" }: { redirectTo?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.email !== ADMIN_EMAIL) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute({ redirectTo = "/" }: { redirectTo?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    // Check if user is admin and redirect to admin dashboard
    if (user.email === ADMIN_EMAIL) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
