"use client";

import { getTournamentData } from "@/app/lib/data";
import React, { useEffect, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BounceLoader } from "react-spinners";
import { ShowTournamentDetails } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";

const ShowTournamentPage = ({ params }: { params: { id: string } }) => {
    const [deletionSuccessful, setDeletionSuccessful] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tournamentData, setTournamentData] = useState<any>(null);
    const router = useRouter();

    const ID = params.id;

    const { data } = useSession();

    // fetch Tournament Data
    useEffect(() => {
        const fetchTournamentData = async () => {
            setIsDataLoading(true);
            const res = await getTournamentData(ID);
            if (res) {
                setTournamentData(res);
            }
            setIsDataLoading(false);
        };

        fetchTournamentData();
    }, []);

    return (
        <div className="section-container tw-mt-4">
            <Link href={`/dashboard/tournaments`}>
                <ArrowBackIcon />
            </Link>
            <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
                TOURNAMENT DETAILS
            </h2>
            {tournamentData ? (
                <ShowTournamentDetails tournamentData={tournamentData} />
            ) : (
                <BounceLoader color="#F2CA16" />
            )}
            {data?.user.role !== "guest" && data?.user.role !== "moderator" ? (
                <button
                    className="btn-transparent-white tw-m-4"
                    onClick={() =>
                        router.push(
                            `/dashboard/tournaments/edit_tournaments/${ID}`
                        )
                    }
                >
                    Edit User
                </button>
            ) : null}
        </div>
    );
};

export default ShowTournamentPage;
