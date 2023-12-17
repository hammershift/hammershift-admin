import React from "react";
import { redirect } from "next/navigation";

const ShowWagerRedirect = ({ params }: { params: { id: string } }) => {
    redirect(`/dashboard/wagers`);
    return <div></div>;
};

export default ShowWagerRedirect;
