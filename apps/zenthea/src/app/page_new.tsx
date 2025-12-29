"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.push("/auth/signin");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zenthea-teal text-white font-bold text-2xl mx-auto mb-4">
          Z
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Zenthea EHR</h1>
        <p className="text-text-secondary">Redirecting to login...</p>
      </div>
    </div>
  );
}
