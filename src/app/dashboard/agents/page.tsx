"use client";

import { getAgents } from "@/app/lib/data";
import { AgentData } from "@/app/lib/interfaces";
import AgentsPage from "@/app/ui/dashboard/agentsPage/AgentsPage";
import React, { useEffect, useState } from "react";

const Agents = () => {
  const [adminData, setAdminData] = useState<AgentData[]>([]);

  const fetchData = async () => {
    try {
      const data = await getAgents();

      if (data && "agents" in data) {
        console.log(data);
        setAdminData(data.agents as AgentData[]);
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

  return <AgentsPage data={adminData} />;
};

export default Agents;
