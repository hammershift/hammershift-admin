"use client";
import { AgentData } from "@/app/lib/interfaces";
import Link from "next/link";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import React, { useState } from "react";

interface AgentsPageProps {
  data: AgentData[];
}

const AgentsPage: React.FC<AgentsPageProps> = ({ data }) => {
  // const [showModal, setShowModal] = useState(false);
  // const [selectedUsername, setSelectedUsername] = useState<string>("");
  // const [selectedUserId, setSelectedUserId] = useState<string>("");

  return (
    <div className="section-container mt-4">
      <div className="flex justify-between">
        <h2 className="font-bold text-yellow-500 text-xl m-2">Admin List</h2>
      </div>
      <table className="w-full border-separate border-spacing-y-2 text-center">
        <thead>
          <tr>
            <td className="p-2.5 font-bold max-md:hidden">Agent ID</td>
            <td className="p-2.5 font-bold">Username</td>
            <td className="p-2.5 font-bold">Full Name</td>
            <td className="p-2.5 font-bold">Email</td>
            <td className="p-2.5 font-bold">Actions</td>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="rounded-lg m-2 bg-[#fff]/5">
              <td className="p-2.5 max-md:hidden">{item._id}</td>
              <td className="p-2.5">{item.username}</td>
              <td className="p-2.5">{item.fullName}</td>
              <td className="p-2.5">{item.email}</td>
              <td className="p-2.5">
                <div className="flex justify-center">
                  <div className="flex gap-2 justify-center">
                    <Link href={`/dashboard/agents/edit_agent/${item._id}`}>
                      <EditIcon />
                    </Link>
                    <Link href={`/dashboard/agents/show_agent/${item._id}`}>
                      <DvrIcon />
                    </Link>
                    {/* <Link href={`/dashboard/agents/delete_agent/${item._id}`}>
                      <DeleteIcon
                        sx={{
                          color: "#C2451E",
                        }}
                      />
                    </Link> */}
                    {/* <button
                          onClick={() => {
                            setShowModal(true);
                            setSelectedUsername(item.username);
                            setSelectedUserId(item._id);
                          }}
                        >
                          <BlockIcon />
                        </button> */}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AgentsPage;
