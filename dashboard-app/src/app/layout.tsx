"use client";

import { useEffect } from "react";
import "@fontsource/outfit/latin.css";
import "./globals.css";

import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      const originalError = console.error;

      console.error = (...args) => {
        const message = args[0];
        if (
          typeof message === "string" &&
          message.includes("hydrated but some attributes of the server rendered HTML")
        ) {
          return; // suppress hydration mismatch warning
        }

        originalError(...args);
      };
    }
  }, []);

  return (
    <html lang="en">
      <body className="dark:bg-gray-900">
        <ToastContainer position="top-right" autoClose={3000} />
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
