import React from "react";
import { redirect } from "next/navigation";

const EditAgentRedirect = () => {
  redirect("/dashboard/agents");

  return <div>EditAgentRedirect</div>;
};

export default EditAgentRedirect;
