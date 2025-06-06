"use client";
import { AgentData } from "@/app/lib/interfaces";
import Link from "next/link";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/ui/components/dialog";
import { Button } from "../../components/button";
import { Bot, Edit, Trash2 } from "lucide-react";
import { Label } from "../../components/label";
import { Input } from "../../components/input";
import { Textarea } from "../../components/textarea";

interface AgentsPageProps {
  agentData: AgentData[];
  fetchData: () => void;
}

const AgentsPage: React.FC<AgentsPageProps> = ({ agentData, fetchData }) => {
  const defaultAgent: AgentData = {
    _id: "",
    username: "",
    fullName: "",
    email: "",
    agentProperties: {
      systemInstruction: "",
    },
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentData>();
  const [newAgent, setNewAgent] = useState(defaultAgent);
  const [emptyInputError, setEmptyInputError] = useState(false);
  const [agentInputError, setAgentInputError] = useState(false);
  const [agentInputErrorMessage, setAgentInputErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const defaultInstruction =
    "You are given a description of a vehicle and you must predict its final selling price. You must also provide a reason for your prediction. If you cannot predict the price of the vehicle, please respond with 'I am sorry, but I cannot predict the price of this vehicle.'";

  const handleNewAgentChange = (e: any) => {
    setEmptyInputError(false);
    setAgentInputError(false);
    switch (e.target.name) {
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
      case "systemInstruction":
        const systemInstruction = e.target.value.replace(/\s+/g, " ");
        if (!systemInstruction) {
          setEmptyInputError(true);
        }

        setNewAgent({
          ...newAgent,
          agentProperties: {
            systemInstruction: systemInstruction,
          },
        });
        break;
      default:
        break;
    }
  };

  const handleNewAgentSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEmptyInputError(false);
    if (!newAgent.fullName || !newAgent.agentProperties.systemInstruction) {
      setEmptyInputError(true);
    } else {
      try {
        const response = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            ...newAgent,
            fullName: newAgent.fullName.trim(),
          }),
        });

        const data = await response.json();
        if (response.status === 400) {
          setAgentInputError(true);
          setAgentInputErrorMessage(data.message);
        } else if (!response.ok) {
          console.error("Error creating agent account");
        } else {
          setNewAgent(defaultAgent);
          alert("Agent account created successfully!");
          console.log("Success:", newAgent);
          setShowAddModal(false);
          fetchData();
        }
      } catch (error) {
        return console.error("Internal server error", error);
      }
    }
    setIsSubmitting(false);
  };

  const handleSelectedAgentChange = (e: any) => {
    setEmptyInputError(false);
    setAgentInputError(false);
    switch (e.target.name) {
      case "fullName":
        const fullName = e.target.value.replace(/\s+/g, " ");
        if (!fullName) {
          setEmptyInputError(true);
        }
        setSelectedAgent({
          ...selectedAgent!,
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

        setSelectedAgent({
          ...selectedAgent!,
          agentProperties: {
            systemInstruction: systemInstruction,
          },
        });
        break;
      default:
        break;
    }
  };

  const handleSelectedAgentSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEmptyInputError(false);
    if (
      !selectedAgent!.fullName ||
      !selectedAgent!.agentProperties.systemInstruction
    ) {
      setEmptyInputError(true);
    } else {
      try {
        const response = await fetch("/api/agents", {
          method: "PUT",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify({
            ...selectedAgent,
            fullName: selectedAgent!.fullName.trim(),
          }),
        });

        const data = await response.json();
        console.log(data);
        if (response.status === 400) {
          setAgentInputError(true);
          setAgentInputErrorMessage(data.message);
        } else if (!response.ok) {
          console.error("Error updating agent account");
        } else {
          alert("Agent account updated successfully!");
          console.log("Success:", newAgent);
          setShowEditModal(false);
          fetchData();
        }
      } catch (error) {
        return console.error("Internal server error", error);
      }
    }
    setIsSubmitting(false);
  };

  const handleAgentDelete = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/agents", {
        method: "DELETE",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(selectedAgent),
      });

      await response.json();
      if (!response.ok) {
        console.error("Error deleting agent account");
      } else {
        alert("Agent account delete successfully!");
        setShowDeleteModal(false);
        fetchData();
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-yellow-500">
              Agent List
            </CardTitle>
            <CardDescription>
              Manage AI agents and their system instructions
            </CardDescription>
          </div>
          <Button
            className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
            onClick={() => {
              setShowAddModal(true);
              setNewAgent(defaultAgent);
              setEmptyInputError(false);
            }}
          >
            <Bot className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-yellow-500/90">
                    Username
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Full Name
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Email
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    System Instruction
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentData &&
                  agentData.map((agent: AgentData, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {agent.username}
                      </TableCell>
                      <TableCell className="font-medium">
                        {agent.fullName}
                      </TableCell>
                      <TableCell className="font-medium">
                        {agent.email}
                      </TableCell>
                      <TableCell className="font-medium">
                        {agent.agentProperties.systemInstruction}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit User"
                            className={""}
                            onClick={() => {
                              setShowEditModal(true);
                              setSelectedAgent({
                                ...agent,
                                agentProperties: {
                                  systemInstruction:
                                    agent.agentProperties.systemInstruction
                                      .replace(defaultInstruction, "")
                                      .trim(),
                                },
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={"text-red-700"}
                            title={"Delete User"}
                            onClick={() => {
                              setShowDeleteModal(true);
                              setSelectedAgent(agent);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogContent className="bg-[#13202D] border-[#1E2A36]">
              <DialogHeader>
                <DialogTitle>Add Agent</DialogTitle>
                <DialogDescription>
                  Provide information for new AI agent
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    {"Full Name (First + Last)"}
                  </Label>
                  <Input
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] ${
                      emptyInputError && newAgent?.fullName == ""
                        ? "border-red-500"
                        : ""
                    }`}
                    name="fullName"
                    type="text"
                    value={newAgent?.fullName || ""}
                    onChange={handleNewAgentChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    {"Username (auto-generated)"}
                  </Label>
                  <Input
                    className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"
                    name="username"
                    type="text"
                    value={
                      "ai." +
                      newAgent.fullName
                        .trim()
                        .replace(/\s+/g, " ")
                        .replaceAll(" ", "_")
                        .toLowerCase()
                    }
                    disabled
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    {"Email (auto-generated)"}
                  </Label>
                  <Input
                    className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"
                    name="email"
                    type="email"
                    value={
                      "ai." +
                      newAgent.fullName
                        .trim()
                        .replace(/\s+/g, " ")
                        .replaceAll(" ", "_")
                        .toLowerCase() +
                      "@hammershift.com"
                    }
                    disabled
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">System Instruction</Label>
                  <Textarea
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] ${
                      emptyInputError &&
                      newAgent?.agentProperties.systemInstruction == ""
                        ? "border-red-500"
                        : ""
                    }`}
                    name="systemInstruction"
                    type="text"
                    rows={"10"}
                    value={newAgent.agentProperties.systemInstruction || ""}
                    onChange={handleNewAgentChange}
                  />
                </div>
                {emptyInputError ? (
                  <p className="mt-4 text-red-500 text-center">
                    Please fill-out required fields
                  </p>
                ) : agentInputError ? (
                  <p className="mt-4 text-red-500 text-center">
                    {agentInputErrorMessage}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <form onSubmit={handleNewAgentSubmit}>
                  <Button
                    type="submit"
                    className={`bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90 ${
                      isSubmitting ? "pointer-events-none opacity-50" : ""
                    }`}
                    aria-disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {selectedAgent && (
            <div className="flex items-center gap-1">
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="bg-[#13202D] border-[#1E2A36]">
                  <DialogHeader>
                    <DialogTitle>Edit Agent</DialogTitle>
                    <DialogDescription>
                      Update information for{" "}
                      <span className="font-semibold text-yellow-400">
                        {selectedAgent!.username}
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                        {"Full Name (First + Last)"}
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] ${
                          emptyInputError && selectedAgent?.fullName == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="fullName"
                        type="text"
                        value={selectedAgent?.fullName || ""}
                        onChange={handleSelectedAgentChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                        {"Username (auto-generated)"}
                      </Label>
                      <Input
                        className="col-span-3 bg-[#1E2A36] border-[#1E2A36]"
                        name="username"
                        type="text"
                        value={
                          "ai." +
                          selectedAgent.fullName
                            .trim()
                            .replace(/\s+/g, " ")
                            .replaceAll(" ", "_")
                            .toLowerCase()
                        }
                        disabled
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">
                        {"Email (auto-generated)"}
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] ${
                          emptyInputError && selectedAgent?.email == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="email"
                        type="email"
                        value={
                          "ai." +
                          selectedAgent.fullName
                            .trim()
                            .replace(/\s+/g, " ")
                            .replaceAll(" ", "_")
                            .toLowerCase() +
                          "@hammershift.com"
                        }
                        disabled
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">System Instruction</Label>
                      <Textarea
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] ${
                          emptyInputError &&
                          selectedAgent?.agentProperties.systemInstruction == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="systemInstruction"
                        type="text"
                        rows={10}
                        value={
                          selectedAgent.agentProperties.systemInstruction || ""
                        }
                        onChange={handleSelectedAgentChange}
                      />
                    </div>
                    {emptyInputError ? (
                      <p className="mt-4 text-red-500 text-center">
                        Please fill-out required fields
                      </p>
                    ) : agentInputError ? (
                      <p className="mt-4 text-red-500 text-center">
                        {agentInputErrorMessage}
                      </p>
                    ) : null}
                  </div>
                  <DialogFooter>
                    <form onSubmit={handleSelectedAgentSubmit}>
                      <Button
                        type="submit"
                        className={`bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90 ${
                          isSubmitting ? "pointer-events-none opacity-50" : ""
                        }`}
                        aria-disabled={isSubmitting}
                      >
                        {isSubmitting ? "Updating..." : "Update"}
                      </Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="bg-[#13202D] border-[#1E2A36]">
                  <DialogHeader>
                    <DialogTitle className="text-red-700 text-xl">
                      Delete Agent
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-red-700">
                        {selectedAgent!.username}
                      </span>
                      ?
                    </DialogDescription>
                  </DialogHeader>

                  <div className="p-2 m-2 text-sm">
                    <p className="text-lg font-bold text-red-700 text-center">
                      Warning
                    </p>
                    <p className={"text-justify"}>
                      {
                        "By deleting this agent account, it will no longer generate predictions for Velocity Market"
                      }
                    </p>
                  </div>
                  <DialogFooter>
                    <form onSubmit={handleAgentDelete}>
                      <Button
                        type="submit"
                        className={`bg-red-700 text-[#0C1924] hover:bg-red-700/90" ${
                          isSubmitting ? "pointer-events-none opacity-50" : ""
                        }`}
                        aria-disabled={isSubmitting}
                      >
                        {isSubmitting ? "Deleting..." : "Delete"}
                      </Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentsPage;
