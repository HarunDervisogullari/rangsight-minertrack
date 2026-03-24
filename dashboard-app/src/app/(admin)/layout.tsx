// src/app/(admin)/layout.tsx
"use client";
import React, { useEffect } from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import useAuth from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Always call hooks unconditionally
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [loading, user, router]);

  let content;

  if (loading) {
    content = (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-lg font-medium">Loading...</p>
      </div>
    );
  } else if (!user) {
    // When loading is done and there's no user, we return nothing (or a fallback message).
    content = (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-lg font-medium">You are not logged in. Please sign in.</p>
      </div>
    );
  } else {
    const mainContentMargin = isMobileOpen
      ? "ml-0"
      : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

    content = (
      <div className="min-h-screen xl:flex">
        <AppSidebar />
        <Backdrop />
        <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
          <AppHeader />
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
        </div>
      </div>
    );
  }

  return content;
}
