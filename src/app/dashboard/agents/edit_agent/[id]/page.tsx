"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { editAgentWithId } from "@/app/lib/data";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { AgentData } from "@/app/lib/interfaces";
import { dataFocusVisibleClasses } from "@nextui-org/react";

const EditAgent = ({ params }: { params: { id: string } }) => {
  const [data, setData] = useState<AgentData>();
  const [newData, setNewData] = useState<AgentData>();
  const [requiredFieldsError, setRequiredFieldsError] = useState(false);
  const [emptyInputError, setEmptyInputError] = useState(false);
  const router = useRouter();
  const ID = params.id;

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/agents?agent_id=" + ID);
      const json = await res.json();
      setData(json);
      setNewData(json);
    };
    fetchData();
  }, []);

  const handleChange = (e: any) => {
    setEmptyInputError(false);
    setRequiredFieldsError(false);
    console.log(newData);
    console.log(e.target.id);
    switch (e.target.id) {
      case "fullName":
        const fullName = e.target.value.replace(/\s+/g, " ");
        if (!fullName) {
          setEmptyInputError(true);
        }
        setNewData({
          ...newData!,
          fullName: fullName.replace(/\s+/g, " "),
          username: "ai." + fullName.trim().replaceAll(" ", "_").toLowerCase(),
          email:
            "ai." +
            fullName.trim().replaceAll(" ", "_").toLowerCase() +
            "@hammershift.com",
        });
        break;
      case "systemInstruction":
        const systemInstruction = e.target.value.replace(/\s+/g, " ");
        if (!systemInstruction) {
          setEmptyInputError(true);
        }
        setNewData({
          ...newData!,
          agentProperties: { systemInstruction: systemInstruction },
        });
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    console.log(newData);
  }, [newData]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setEmptyInputError(false);
    setRequiredFieldsError(false);
    console.log(newData);
    if (
      newData?.fullName == "" ||
      newData?.agentProperties.systemInstruction == ""
    ) {
      setEmptyInputError(true);
      setRequiredFieldsError(true);
    } else {
      const res = await editAgentWithId(ID, {
        ...newData,
        fullName: newData!.fullName.trim(),
      });
      console.log(res);
      if (res.message == "Edit Successful") {
        alert("Agent Edit Successful");
        router.push("/dashboard/agents");
      } else {
        alert(res.message);
        console.error("unauthorized", res);
      }
    }
  };

  // const revertChanges = (e: any) => {
  //     location.reload();
  // };

  return (
    data != undefined && (
      <div className="section-container mt-4">
        <Link href={`/dashboard/agents`}>
          <ArrowBackIcon />
        </Link>
        <h2 className="font-bold m-4 text-yellow-500">EDIT AGENT ACCOUNT</h2>{" "}
        {data && (
          <form>
            <div className="flex flex-col justify-between gap-4 m-6">
              <div className="flex justify-between sm:w-2/5">
                <label className="px-6">Agent ID:</label>
                <input
                  type="text"
                  id="_id"
                  value={newData?._id || ""}
                  className="text-white/50 px-1"
                  disabled
                />
              </div>
              <div className="flex justify-between sm:w-2/5">
                <label className="px-6">Full Name:</label>
                <input
                  id="fullName"
                  type="text"
                  value={newData?.fullName || ""}
                  className={`bg-[#fff]/20 text-white/50 border-2 px-1 ${
                    emptyInputError ? "border-red-500" : "border-yellow-500"
                  }`}
                  onChange={handleChange}
                />
              </div>
              <div className="flex justify-between sm:w-2/5">
                <label className="px-6">Username:</label>
                <input
                  id="username"
                  type="text"
                  value={
                    "ai." +
                      newData?.fullName
                        .trim()
                        .replace(/\s+/g, " ")
                        .replaceAll(" ", "_")
                        .toLowerCase() || ""
                  }
                  disabled
                  className="text-white/50 px-1"
                />
              </div>
              <div className="flex justify-between sm:w-2/5">
                <label className="px-6">Email:</label>
                <input
                  id="email"
                  type="email"
                  value={
                    "ai." +
                      newData?.fullName
                        .trim()
                        .replace(/\s+/g, " ")
                        .replaceAll(" ", "_")
                        .toLowerCase() +
                      "@hammershift.com" || ""
                  }
                  disabled
                  className="text-white/50 px-1"
                />
              </div>
              <div className="flex justify-between w-full md:w-2/5">
                <label className="px-6">System Instruction:</label>
                <textarea
                  id="systemInstruction"
                  value={newData?.agentProperties.systemInstruction || ""}
                  className={`bg-[#fff]/20 w-full text-white/50 border-2 ${
                    emptyInputError ? "border-red-500" : "border-yellow-500"
                  }`}
                  rows={5}
                  onChange={handleChange}
                />
              </div>
              {requiredFieldsError ? (
                <p className="text-red-500">Please fill-out required fields</p>
              ) : null}
              <div className="flex gap-1 justify-evenly w-2/5 m-4">
                {/* <Link href={`/dashboard/agents/delete_agent/${ID}`}>
                  <button className="btn-transparent-red">DELETE AGENT</button>
                </Link> */}
                <button
                  className="btn-transparent-white"
                  type="submit"
                  onClick={handleSubmit}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    )
  );
};

export default EditAgent;
