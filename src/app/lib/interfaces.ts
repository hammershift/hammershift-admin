import { Types } from "mongoose";

export interface AgentData {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  agentProperties: {
    systemInstruction: string;
  };
}

export enum Role {
  USER = "USER",
  AGENT = "AGENT",
}
export interface AgentProperties {
  systemInstruction: string;
}
