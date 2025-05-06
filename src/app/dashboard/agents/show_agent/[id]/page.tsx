"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSession } from "next-auth/react";
import { AgentData } from "@/app/lib/interfaces";

const ShowAgent = ({ params }: { params: { id: string } }) => {
  const [agentData, setAgentData] = useState<AgentData>();
  const router = useRouter();
  const ID = params.id;

  const { data } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/agents?agent_id=" + ID);
      const json = await res.json();
      console.log(json);
      setAgentData(json);
    };
    fetchData();
  }, []);

  return (
    agentData != undefined && (
      <div className="section-container mt-4">
        <Link href={`/dashboard/agents`}>
          <ArrowBackIcon />
        </Link>
        <h2 className="font-bold m-4 text-yellow-500">AGENT ACCOUNT DETAILS</h2>
        <div className="flex flex-col">
          <div className="flex justify-between w-1/2 mx-4 my-2 max-lg:w-full">
            <h4>User ID:</h4>
            <p className="px-3">{agentData._id}</p>
          </div>
          <div className="flex justify-between w-1/2 mx-4 my-2 max-lg:w-full">
            <h4>Full Name:</h4>
            <p className="px-3">{agentData.fullName}</p>
          </div>
          <div className="flex justify-between w-1/2 mx-4 my-2 max-lg:w-full">
            <h4>Username:</h4>
            <p className="px-3">{agentData.username}</p>
          </div>
          <div className="flex justify-between w-1/2 mx-4 my-2 max-lg:w-full">
            <h4>Email:</h4>
            <p className="px-3">{agentData.email}</p>
          </div>
          <div className="flex justify-between w-1/2 mx-4 my-2 max-lg:w-full">
            <h4>System Instruction:</h4>
            <p className="px-3 text-right">
              {agentData.agentProperties.systemInstruction}
            </p>
          </div>
        </div>
        {data?.user.role !== "guest" && data?.user.role !== "moderator" ? (
          <button
            className="btn-transparent-white m-4"
            onClick={() => router.push(`/dashboard/agents/edit_agent/${ID}`)}
          >
            Edit Agent
          </button>
        ) : null}
      </div>
    )
  );
};

export default ShowAgent;
