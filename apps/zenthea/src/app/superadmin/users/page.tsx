import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { UserList } from "@/components/superadmin/users/UserList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Management | Superadmin",
  description: "Manage all users across all tenants",
};

export default function UsersPage() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
          <p className="text-text-secondary mt-2">
            View and manage all users across all tenants in the platform
          </p>
        </div>

        <UserList />
      </div>
    </SuperAdminLayout>
  );
}

