"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Check for OAuth errors in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const message = params.get("message");
    
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
        token_validation_failed: message || "Token validation failed. Please try logging in again.",
        jwt_invalid_usage: message || "JWT tidak valid, waktu issued sudah lewat. Silakan login kembali.",
        jwt_expired: message || "JWT token sudah expired. Silakan login kembali.",
      };
      setErrorMessage(errorMap[error] || `Error: ${error} - ${message}`);
    }
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl flex gap-8 h-full max-h-[900px]">
        {/* Left Side - Promotion Image (75%) */}
        <div className="hidden lg:flex lg:w-3/4 h-full items-center justify-center">
          <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80"
              alt="Promotion"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 flex items-center justify-center">
              <div className="text-center text-white p-8">
                <h1 className="text-5xl font-bold mb-4">DOIEHub</h1>
                <p className="text-2xl mb-6">Application Promotion System</p>
                <p className="text-lg opacity-90 max-w-md mx-auto">
                  Promote your applications and reach millions of users worldwide
                </p>
                <div className="mt-8 flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">10K+</div>
                    <div className="text-sm opacity-80">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">500+</div>
                    <div className="text-sm opacity-80">Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">99.9%</div>
                    <div className="text-sm opacity-80">Uptime</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form (Full Height) */}
        <div className="w-full lg:w-1/4 h-full flex flex-col justify-center">
          <div className="flex flex-col h-full justify-center space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                <h1 className="text-3xl font-bold text-white">DOIE</h1>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                Welcome Back
              </h2>
              <p className="text-gray-600 font-medium">
                Sign in to access your dashboard
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <div className="p-8">
                  {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <div className="space-y-6">
                    <a href="/api/auth/google" className="block w-full">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-14 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <Chrome className="mr-4 h-6 w-6 text-gray-600 group-hover:text-blue-600" />
                        <span className="font-medium text-gray-700 group-hover:text-blue-600 text-lg">
                          Continue with Google
                        </span>
                      </Button>
                    </a>
                  </div>

                  <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm font-medium">
                      Powered by Super Apps
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-600 font-medium">
                © 2026 DOIEHub. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
