"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Traffboard
        </h1>
        <p className="text-center text-xl text-gray-600 mb-8">
          Analytics
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
