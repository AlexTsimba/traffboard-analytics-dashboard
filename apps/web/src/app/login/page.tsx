"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginCredentials } from "@traffboard/auth";
import { useAuth } from "@/components/auth/AuthProvider";
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

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState("");
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const { login } = useAuth();
  const router = useRouter();

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", twoFactorCode: "" },
  });

  // Cooldown timer effect
  useEffect(() => {
    if (remainingCooldown > 0) {
      const timer = setTimeout(() => {
        setRemainingCooldown(remainingCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingCooldown]);

  const startCooldown = () => {
    setRemainingCooldown(30);
  };

  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        return;
      }

      if (response.ok) {
        login(result.accessToken, result.refreshToken, result.user);
        router.push("/");
      } else {
        setError(result.error || "Login failed");
        
        // Start cooldown if rate limited
        if (response.status === 429) {
          startCooldown();
        }
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Enter your credentials to access Traffboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {requiresTwoFactor && (
                <FormField
                  control={form.control}
                  name="twoFactorCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>2FA Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter 6-digit code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              {remainingCooldown > 0 && (
                <div className="text-orange-600 text-sm">
                  Too many attempts. Please wait {remainingCooldown} seconds.
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || remainingCooldown > 0}
              >
                {remainingCooldown > 0 
                  ? `Wait ${remainingCooldown}s` 
                  : isLoading 
                    ? "Signing in..." 
                    : "Sign In"
                }
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
