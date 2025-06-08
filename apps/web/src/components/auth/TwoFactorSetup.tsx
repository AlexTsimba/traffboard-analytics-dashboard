"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { twoFactorSchema, type TwoFactorToken } from "@traffboard/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TwoFactorSetupProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function TwoFactorSetup({ onComplete, onSkip }: TwoFactorSetupProps) {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"setup" | "verify">("setup");

  const form = useForm<TwoFactorToken>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { token: "" },
  });

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const response = await fetch("/api/auth/setup-2fa", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setStep("verify");
      }
    } catch (err) {
      setError("Failed to generate QR code");
    }
  };

  const verifyCode = async (data: TwoFactorToken) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({ token: data.token, secret }),
      });

      if (response.ok) {
        onComplete();
      } else {
        const result = await response.json();
        setError(result.error || "Invalid code");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set Up Two-Factor Authentication</CardTitle>
        <CardDescription>
          Scan the QR code with your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "verify" && (
          <>
            {qrCode && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="2FA QR Code" className="border rounded" />
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(verifyCode)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter 6-digit code" 
                          maxLength={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Enable 2FA"}
                  </Button>
                  {onSkip && (
                    <Button type="button" variant="outline" onClick={onSkip}>
                      Skip for now
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
