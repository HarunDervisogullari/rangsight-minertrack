"use client";

import { useEffect } from "react";
import { ToastContainer } from "react-toastify";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";

type AppProvidersProps = {
  children: React.ReactNode;
};

export default function AppProviders({ children }: AppProvidersProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
      return;
    }

    const originalError = console.error;

    console.error = (...args) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        message.includes("hydrated but some attributes of the server rendered HTML")
      ) {
        return;
      }

      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <ThemeProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </ThemeProvider>
    </>
  );
}
