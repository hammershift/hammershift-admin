export interface Admin {
    _id?: string;
    username: string;
    password?: string;
    image?: string;
    role?: string;
}

export interface Credentials {
    username: string;
    password: string;
}
