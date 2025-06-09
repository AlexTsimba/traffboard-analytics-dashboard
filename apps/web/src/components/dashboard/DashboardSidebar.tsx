"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BarChart3, Users, TrendingUp, Shield, Home } from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Conversions", href: "/dashboard/conversions", icon: BarChart3 },
  { name: "Players", href: "/dashboard/players", icon: Users },
  { name: "Cohorts", href: "/dashboard/cohorts", icon: TrendingUp },
  { name: "Quality", href: "/dashboard/quality", icon: Shield },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-semibold">Traffboard</h1>
      </div>
      <nav className="mt-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm hover:bg-gray-50",
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-700"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
