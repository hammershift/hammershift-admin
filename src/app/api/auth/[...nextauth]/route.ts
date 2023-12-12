import NextAuth, {NextAuthConfig} from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import {users} from '@/constants';


const authOptions: NextAuthConfig = {
    providers:[
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email', placeholder: 'you@gmail.com' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {

                //get the user from the database
                if (!credentials || !credentials.email || !credentials.password) {
                    return null;
                }

                const user = users.find((item: any) => item.email === credentials.email);
                if(user?.password === credentials.password){
                    return user;
                }

                return null;
            },
          
        })
    ], secret: process.env.SECRET, session: {
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST}

