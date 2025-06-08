"use client";

import { useRouter } from "next/navigation";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";

export default function Setup2FAPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push("/");
  };

  const handleSkip = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <TwoFactorSetup onComplete={handleComplete} onSkip={handleSkip} />
    </div>
  );
}
