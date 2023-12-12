import { signIn } from "next-auth/react";

export const authenticate = async (formData : any) => {
const {username, password} = Object.fromEntries(formData);

try{
    await signIn('credentials', {username, password})
}catch(error){
    console.log(error)
    throw error;

}

}