import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/server";

export default async function Home() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  return (
    <div className="font-sans grid grid-cols-1 gap-2 max-w-4xl mx-auto p-2 sm:p-0">
      <div className="flex items-center justify-between gap-2 border-b p-2 mb-4">
        {error || !data?.claims ? (
          <p>User: unauthenticated</p>
        ) : (
          <>
            <p>User: {data.claims.email}</p>
            <LogoutButton />
          </>
        )}
      </div>
      <h1 className="text-xl font-bold mb-4 p-2">a-rol</h1>
    </div>
  );
}
