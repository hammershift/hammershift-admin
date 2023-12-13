export interface Admin {
  _id?: string;
  username: string;
  password?: string;
  image?: string;
}

export interface Credentials {
  username: string;
  password: string;
}