import { Types } from "mongoose";

export interface AgentData {
  _id: string;
  username: string;
  fullName: string;
  email: string;
}

export interface User {
  _id: Types.ObjectId;
  username: string;
  fullName: string;
  email: string;
  balance: number;
  isActive: boolean;
  isBanned: boolean;
  provider: string;
  about: string;
  createdAt: Date;
  updatedAt: Date;
  isAgent?: boolean;
}

export interface Admin {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  role: string;
}
