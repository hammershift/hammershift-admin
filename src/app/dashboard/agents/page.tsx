"use client";

import { getAgentsWithSearch } from "@/app/lib/data";
import { AgentData } from "@/app/lib/interfaces";
import AgentsPage from "@/app/ui/dashboard/agentsPage/AgentsPage";
import React, { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";

const Agents = () => {
  const [agentData, setAgentData] = useState<AgentData[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAgents, setTotalAgents] = useState(0);
  const [displayCount, setDisplayCount] = useState(3);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getAgentsWithSearch({
        search: searchValue,
        offset: (currentPage - 1) * displayCount,
        limit: displayCount,
      });

      if (data && "agents" in data) {
        setTotalAgents(data.total);
        setTotalPages(data.totalPages);
        setAgentData(data.agents as AgentData[]);
        setIsLoading(false);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchValue]);

  return (
    <div className="section-container mt-4">
      <AgentsPage
        agentData={agentData}
        fetchData={fetchData}
        setSearchValue={setSearchValue}
        isLoading={isLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
};

export default Agents;
