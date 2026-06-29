"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Check for OAuth errors in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      const errorMap: Record<string, string> = {
        token_exchange_failed:
          "Google OAuth configuration error. Check your credentials.",
        no_id_token: "Failed to get ID token from Google.",
        token_verification_failed: "Failed to verify Google token.",
        missing_credentials: "OAuth credentials not configured.",
        invalid_client: "Invalid Google Client ID or Secret.",
        no_email: "Google account has no email.",
        access_denied: "You denied access to Google sign-in.",
        callback_error: "An error occurred during OAuth callback.",
      };
      setErrorMessage(errorMap[error] || `OAuth error: ${error}`);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Login failed");
        return;
      }

      toast.success("Login successful!");

      // refresh auth context before navigating so dashboard layout
      // doesn't immediately redirect back to login
      await refetchUser();

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">DOIEHub</h1>
          <p className="text-muted-foreground">Application Promotion System</p>
        </div>

        <Card className="shadow-lg">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Welcome Back
            </h2>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-border focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="border-border focus:border-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            <a href="/api/auth/google" className="w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full mt-4 border-border hover:bg-secondary"
              >
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
            </a>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Power By Super Apps
                {/* <Link
                  href="/register"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link> */}
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-8 p-4 bg-card rounded-lg border border-border text-center">
          <p className="text-xs text-muted-foreground">
            POWER BY @2026 RAMADHAN
          </p>
        </div>
      </div>
    </div>
  );
}
