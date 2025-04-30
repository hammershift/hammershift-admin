"use client";

import { AgentData } from "@/app/lib/interfaces";
import React, { useState } from "react";

const CreateAIAgentPage = () => {
  const [newAgent, setNewAgent] = useState({
    fullName: "",
    username: "",
    email: "",
  });
  const [requiredFieldsError, setRequiredFieldsError] = useState(false);
  const [agentList, setAgentList] = useState<AgentData[]>([]);
  const [emptyInputError, setEmptyInputError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.id) {
      case "fullName":
        const fullName = e.target.value.replace(/\s+/g, " ");
        if (!fullName) {
          setEmptyInputError(true);
        }
        setNewAgent({
          ...newAgent,
          fullName: fullName.replace(/\s+/g, " "),
          username: "ai." + fullName.trim().replaceAll(" ", "_").toLowerCase(),
          email:
            "ai." +
            fullName.trim().replaceAll(" ", "_").toLowerCase() +
            "@hammershift.com",
        });
        break;
      default:
        break;
    }
  };
  const handleCreateAccountButtonClick = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          ...newAgent,
          fullName: newAgent.fullName.trim(),
        }),
      });

      const data = (await response.json()) as { message: string };
      if (data.message === "Agent already exists") {
        alert("Agent already exists");
      } else if (!newAgent.username || !newAgent.fullName || !newAgent.email) {
        setEmptyInputError(true);
        setRequiredFieldsError(true);
      } else if (!response.ok) {
        console.error("Error creating agent account");
      } else {
        setNewAgent({
          username: "",
          fullName: "",
          email: "",
        });
        alert("Agent account created successfully!");
        console.log("Success:", newAgent);
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
  };

  return (
    <div className="section-container mt-4 flex flex-col justify-center items-center max-md:items-start">
      <div className="m-3">
        <h2 className="text-yellow-500 font-bold text-lg">Create New Agent</h2>
      </div>
      <div className="m-7 mt-4">
        <form className="flex flex-col justify-center items-center max-md:items-start">
          <label className="mx-1">{"Full Name (First Name + Last Name)"}</label>
          <input
            type="text"
            placeholder="Full Name *"
            id="fullName"
            value={newAgent.fullName}
            onChange={handleChange}
            className={`bg-[#fff]/20 text-white/50 border-2 px-1 m-2 ${
              emptyInputError ? "border-red-500" : "border-yellow-500"
            }`}
          ></input>
          <label className="mx-1">{"Username (auto-generated)"}</label>
          <input
            type="text"
            placeholder="Username *"
            id="username"
            value={
              "ai." +
              newAgent.fullName
                .trim()
                .replace(/\s+/g, " ")
                .replaceAll(" ", "_")
                .toLowerCase()
            }
            // onChange={handleChange}
            disabled
            className=" text-white/50 px-1 m-2"
          ></input>
          <label className="mx-1">{"Email (auto-generated)"}</label>
          <input
            type="email"
            placeholder=" Email *"
            id="email"
            value={
              "ai." +
              newAgent.fullName
                .trim()
                .replace(/\s+/g, " ")
                .replaceAll(" ", "_")
                .toLowerCase() +
              "@hammershift.com"
            }
            // onChange={handleChange}
            disabled
            className="text-white/50 px-1 m-2"
          ></input>
          {requiredFieldsError ? (
            <p className="text-red-500">Please fill-out required fields</p>
          ) : null}
          <button
            className="h-12 p-1 rounded-full m-1 mt-4 bg-yellow-400 text-black font-bold"
            onClick={handleCreateAccountButtonClick}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateAIAgentPage;
