"use client";

import React, { useEffect, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShowTournamentDetails } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";

const ShowTournamentPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();

  const ID = params.id;

  const { data } = useSession();

  return (
    <div className="section-container mt-4">
      <Link href={`/dashboard/tournaments`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="font-bold m-4 text-yellow-500">TOURNAMENT DETAILS</h2>
      <ShowTournamentDetails tournamentID={ID} labelString="ShowTournament" />
      {data?.user.role !== "guest" && data?.user.role !== "moderator" ? (
        <button
          className="btn-transparent-white m-4"
          onClick={() =>
            router.push(`/dashboard/tournaments/edit_tournament/${ID}`)
          }
        >
          Edit Tournament
        </button>
      ) : null}
    </div>
  );
};

export default ShowTournamentPage;
