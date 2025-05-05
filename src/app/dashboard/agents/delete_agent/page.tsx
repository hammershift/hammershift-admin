import React from "react";
import { redirect } from "next/navigation";

const DeleteAgentRedirect = () => {
  redirect("/dashboard/agents");

  return <div>DeleteAgentRedirect</div>;
};

export default DeleteAgentRedirect;
