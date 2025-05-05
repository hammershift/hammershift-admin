import React from "react";
import { redirect } from "next/navigation";

const ShowAgentRedirect = () => {
  redirect("/dashboard/agents");
  return <div>ShowAgentRedirect</div>;
};

export default ShowAgentRedirect;
