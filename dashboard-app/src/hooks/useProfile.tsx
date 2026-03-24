"use client";
import { useState, useEffect } from "react";

export interface Profile {
  username: string;      // from the users table
  email: string;         // from the users table
  role: string;          // from the users table
  created_at?: string;   // from the users table
  name?: string;         // from the persons table
  surname?: string;      // from the persons table
  position?: string;     // from the persons table
  department?: string;   // from the persons table
  contact?: string;      // from the persons table
  status?: string;
  location?: string;
  level?: number;
  supervisor?: string;
}

export default function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("No token found.");
          setLoading(false);
          return;
        }
        // Use the full URL if your backend runs on a different port
        const res = await fetch("http://localhost:8000/api/auth/profile", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch profile.");
        }
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message || "Error fetching profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  return { profile, loading, error };
}
