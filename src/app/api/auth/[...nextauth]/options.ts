import {NextAuthOptions} from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
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
                
                //Should be : get the user from the database
                const user = {id: 'user01', username: 'Sonic', password: '1234'} // sample data
                if(credentials?.username === user.username && credentials?.password === user.password){
                    console.log("auth returned user")
                    return {username: user.username, id: user.id};
                } else {
                    console.log("auth returned null")
                    return null;
                }
            },
          
        })
    ],
    secret: process.env.AUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/logout',
    },
    callbacks: {
      
    }
}