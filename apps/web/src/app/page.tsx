"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-8">
            Traffboard Analytics
          </h1>
          <p className="text-center text-xl text-gray-600 mb-8">
            Internal analytics dashboard for affiliate marketing
          </p>
          <div className="flex justify-center">
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">
            Welcome to Traffboard Analytics
          </h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user.email}</span>
            {!user.twoFactorEnabled && (
              <Link href="/setup-2fa">
                <Button variant="outline" size="sm">
                  Set up 2FA
                </Button>
              </Link>
            )}
            <Button onClick={logout} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
        <p className="text-center text-xl text-gray-600">
          Dashboard content will be displayed here
        </p>
      </div>
    </main>
  );
}
