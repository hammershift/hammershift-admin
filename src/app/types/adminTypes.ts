export interface Admin {
    _id?: string;
    first_name?:string;
    last_name?:string;
    email?:string;
    username: string;
    password?: string;
    image?: string;
    role?: string;
}

export interface Credentials {
    username: string;
    password: string;
}
