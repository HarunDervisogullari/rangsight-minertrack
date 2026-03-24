// src/hooks/useAuth.tsx
"use client";
import { useState, useEffect } from "react";
import {jwtDecode} from "jwt-decode";

export interface UserData {
  user_id: number;
  username: string;
  email?: string;
  // add other properties as needed
}

export default function useAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<UserData>(token);
        setUser(decoded);
      } catch (error) {
        console.error("Invalid token:", error);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
