import {NextAuthOptions} from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from '@/app/lib/mongoDB';
import { Admin, Credentials } from '@/app/types/userTypes';
import { ObjectId } from 'mongodb';

export const authOptions: NextAuthOptions = {
  debug: true,
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: 'jwt',
  },
    providers:[
        CredentialsProvider({

            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {

                if (!credentials || !credentials.username || !credentials.password) {
                    return null;
                } 
                
                const client = await clientPromise;
                const db = client.db();
                const user = await db.collection<Admin>('admins').findOne({ username: credentials.username });

                if (!user || !user.password || credentials.password != user.password) {
                throw new Error('Invalid credentials');
                }

                return { id: user._id, username: user.username };
            },
          
        })
    ],
    secret: process.env.AUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/logout',
    },
     callbacks: {
    async session({ session, token }) {
      console.log('Session callback - Token:', token);
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
      }
      console.log('Session callback - Final Session object:', session);
      return session;
    },

    async jwt({ token, user }: { token: any, user: any }) {
      console.log('JWT callback - Initial token:', token);
      console.log('JWT callback - User:', user);
      if (user) {
        token.id = user.id;
        token.username = user.username ;
        // token.image = user.image;
      }

      const client = await clientPromise;
      const db = client.db();
      const dbUser = await db.collection('users').findOne({ _id: new ObjectId(token.id) });

      console.log('JWT callback - Fetched User from DB:', dbUser);

      if (dbUser) {
        // token.fullName = dbUser.fullName;
        token.username = dbUser.username;
        // token.image = dbUser.image;
      }

      console.log('JWT callback - Final token:', token);
      return token;
    },
}
}