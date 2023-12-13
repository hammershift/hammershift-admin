import NextAuth, {NextAuthConfig} from 'next-auth';
import { authOptions } from './options';


export const {handlers, auth} = NextAuth(authOptions);



// export { handlers as GET, handlers as POST }