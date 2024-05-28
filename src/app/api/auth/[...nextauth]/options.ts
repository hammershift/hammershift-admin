import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/app/lib/mongoDB";
import { Admin, Credentials } from "@/app/types/adminTypes";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials || !credentials.username || !credentials.password) {
          return null;
        }

        const client = await clientPromise;
        const db = client.db();
        const admin = await db
          .collection<Admin>("admins")
          .findOne({ username: credentials.username });

        if (
          !admin ||
          !admin.password ||
          !(await bcrypt.compare(credentials.password, admin.password))
        ) {
          throw new Error("Invalid credentials");
        }

        return {
          id: admin._id,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          username: admin.username,
          role: admin.role,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/logout",
  },
  callbacks: {
    async session({ session, token }) {
      // console.log("Session callback - Token:", token);
      if (token) {
        session.user.first_name = token.first_name;
        session.user.last_name = token.last_name;
        session.user.email = token.email;
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      // console.log("Session callback - Final Session object:", session);
      return session;
    },

    async jwt({ token, user }: { token: any; user: any }) {
      // console.log("JWT callback - Initial token:", token);
      // console.log("JWT callback - User:", user);
      if (user) {
        token.first_name = user.first_name;
        token.last_name = user.last_name;
        token.email = user.email;
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }

      const client = await clientPromise;
      const db = client.db();
      const dbAdmin = await db
        .collection("admins")
        .findOne({ _id: new ObjectId(token.id) });

      // console.log("JWT callback - Fetched User from DB:", dbAdmin);

      if (dbAdmin) {
        // token.fullName = dbUser.fullName;
        token.username = dbAdmin.username;
        token.role = dbAdmin.role;
      }

      // console.log("JWT callback - Final token:", token);
      return token;
    },
  },
};
