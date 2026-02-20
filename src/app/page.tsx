"use client";

import { useAuth } from "@/context/AuthContext";
import AuthScreen from "@/components/AuthScreen";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950">
      {!user ? <AuthScreen /> : <Dashboard />}
    </main>
  );
}
