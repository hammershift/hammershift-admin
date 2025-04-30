import { AgentData } from "@/app/lib/interfaces";
import React from "react";

interface AgentsPageProps {
  data: AgentData[];
}

const AgentsPage: React.FC<AgentsPageProps> = ({ data }) => {
  return (
    <div className="section-container mt-4">
      <div className="flex justify-between">
        <h2 className="font-bold text-yellow-500 text-xl m-2">Admin List</h2>
      </div>
      <table className="w-full border-separate border-spacing-y-2 text-left">
        <thead>
          <tr>
            <td className="p-2.5 font-bold max-md:hidden">Agent ID</td>
            <td className="p-2.5 font-bold">Username</td>
            <td className="p-2.5 font-bold">Full Name</td>
            <td className="p-2.5 font-bold">Email</td>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="rounded-lg m-2 bg-[#fff]/5">
              <td className="p-2.5 max-md:hidden">{item._id}</td>
              <td className="p-2.5">{item.username}</td>
              <td className="p-2.5">{item.fullName}</td>
              <td className="p-2.5">{item.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AgentsPage;
