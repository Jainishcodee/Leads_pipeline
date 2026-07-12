import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/auth/AuthContext";
import { getAuthErrorMessage } from "@/auth/authErrors";
import { getEmailError, getPasswordError } from "@/lib/validation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SignUp = () => {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const emailError = getEmailError(email);
    const passwordError = getPasswordError(password);
    const confirmError =
      password !== confirmPassword ? "Passwords do not match" : undefined;

    if (emailError || passwordError || confirmError) {
      setErrors({
        email: emailError ?? undefined,
        password: passwordError ?? undefined,
        confirmPassword: confirmError,
      });
      return;
    }
    setErrors({});

    setIsSubmitting(true);

    try {
      const userCredential = await signUp(email.trim(), password);
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.uid), {
        email: userCredential.email,
        name: email.split('@')[0], // Use email prefix as default name
        avatar: null,
        role: 'member',
        organizationId: null,
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Account created!",
        description: "Welcome to Mocha Pipeline.",
      });
      
      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start organizing your leads in minutes."
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in instead
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@mocha.com"
            className="input-mocha"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="input-mocha"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Use at least 6 characters.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="input-mocha"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
        <Button
          type="submit"
          className="btn-mocha w-full"
          disabled={
            isSubmitting || !email || !password || !confirmPassword || password !== confirmPassword
          }
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
};

export default SignUp;
