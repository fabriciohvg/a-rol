"use client";

import { createClient } from "@/lib/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {

  const logout = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
    }

    // Force hard navigation to ensure cookies are cleared and middleware runs
    window.location.href = "/auth/login";
  };

  return (
    <Button size="sm" onClick={logout}>
      Logout
    </Button>
  );
}
