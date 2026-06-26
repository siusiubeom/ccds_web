import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    status?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      status: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    status?: string;
    id?: string;
  }
}
