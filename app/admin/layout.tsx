import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect(session?.user ? "/dashboard" : "/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-48 bg-gray-900 text-gray-100 flex flex-col p-4 gap-2">
        <span className="font-bold text-sm mb-4 text-gray-300">Admin Panel</span>
        <Link href="/admin" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">Dashboard</Link>
        <Link href="/admin/users" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">Users</Link>
        <Link href="/admin/samples" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">Samples</Link>
        <Link href="/admin/models" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">Models</Link>
        <div className="flex-1" />
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button type="submit" className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-sm text-gray-400">
            Sign Out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
