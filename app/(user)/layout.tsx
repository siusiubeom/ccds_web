import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold text-blue-700">CCDS Biomarker Tool</Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">{session.user.email}</span>
          {session.user.role === "ADMIN" && (
            <Link href="/admin" className="px-3 py-1 rounded bg-gray-900 text-white text-xs font-medium hover:bg-gray-700">
              Admin Panel
            </Link>
          )}
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-gray-600 hover:text-red-600">Sign Out</button>
          </form>
        </div>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
