"use client";
import { deleteTournament, getTournamentData } from "@/app/lib/data";
import { set } from "mongoose";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { BeatLoader, BounceLoader } from "react-spinners";
import { ShowTournamentDetails } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";
import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { TournamentType } from "@/app/types/tournamentTypes";

const DeleteTournamentPage = ({ params }: { params: { id: string } }) => {
    const [deletionSuccessful, setDeletionSuccessful] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tournamentData, setTournamentData] = useState<TournamentType | null>(
        null
    );
    const router = useRouter();

    const ID = params.id;
    const handleDeleteTournament = async () => {
        const res = await deleteTournament(ID);
        if (res) {
            setDeletionSuccessful(true);
            setTimeout(() => {
                router.push("/dashboard/tournaments");
            }, 5000);
        } else {
            console.log("Unauthorized Deletion");
        }
    };

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
                DELETE TOURNAMENT
            </h2>
            <ShowTournamentDetails tournamentID={ID} labelString="DELTOU" />
            <div className="tw-flex tw-mt-4 tw-gap-4">
                {isLoading ? (
                    <BeatLoader color="#F2CA16" />
                ) : deletionSuccessful ? (
                    <div className="tw-bg-[#F2CA16] tw-p-2 tw-text-black tw-text-xl tw-font-bold tw-text-center ">
                        Tournament Deleted! Redirecting to Tournaments Page...
                    </div>
                ) : tournamentData?.isActive ? (
                    <div className="tw-p-4">
                        <p className="tw-mb-4">
                            Are you sure you want to delete?
                        </p>
                        <button
                            className="btn-transparent-red"
                            onClick={handleDeleteTournament}
                        >
                            DELETE TOURNAMENT
                        </button>
                    </div>
                ) : (
                    <div className="tw-p-4">
                        <p className="tw-mb-4">
                            Tournament has already been deleted
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteTournamentPage;
