import NextAuth, {NextAuthConfig} from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthConfig = {
    providers:[
        CredentialsProvider({

            name: 'Credentials',
            credentials: {
                username: { label: 'Username', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {

                if (!credentials || !credentials.username || !credentials.password) {
                    return null;
                }
                
                //Should be => get the user from the database
                const user = {id: 'user01', username: 'Sonic', password: '1234'}
                if(credentials?.username === user.username && credentials?.password === user.password){
                    return user;
                } else {
                    return null;
                }
            },
          
        })
    ],
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/logout',
        error: '/', // Error code passed in query string as ?error=
        verifyRequest: '/auth/verify-request', // (used for check email message)
        newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out if not of interest)
    },
    secret: process.env.AUTH_SECRET,
}