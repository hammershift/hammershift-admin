"use client";

import { getAgents } from "@/app/lib/data";
import { AgentData } from "@/app/lib/interfaces";
import AgentsPage from "@/app/ui/dashboard/agentsPage/AgentsPage";
import React, { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";

const Agents = () => {
  const [agentData, setAgentData] = useState<AgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await getAgents();

      if (data && "agents" in data) {
        setAgentData(data.agents as AgentData[]);
        setIsLoading(false);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="section-container mt-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-[592px]">
          <BeatLoader color="#F2CA16" />
        </div>
      ) : (
        <AgentsPage agentData={agentData} fetchData={fetchData} />
      )}
    </div>
  );
};

export default Agents;
