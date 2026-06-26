"use client";

import { useEffect, useState, useCallback } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  status: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/users")
      .then(res => res.ok ? res.json() : [])
      .then((data: User[]) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setActionId(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
    setActionId(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-gray-500">No users found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Registered</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      u.status === "APPROVED" ? "bg-green-100 text-green-700" :
                      u.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 flex gap-2">
                    {u.status !== "APPROVED" && u.role !== "ADMIN" && (
                      <button
                        onClick={() => act(u.id, "approve")}
                        disabled={actionId === u.id}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {u.status !== "REJECTED" && u.role !== "ADMIN" && (
                      <button
                        onClick={() => act(u.id, "reject")}
                        disabled={actionId === u.id}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
