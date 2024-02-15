"use client";
import { deleteTournament, getTournamentData } from "@/app/lib/data";
import { set } from "mongoose";
import React, { useEffect, useState } from "react";
import { BeatLoader, BounceLoader } from "react-spinners";
import { ShowTournamentDetails } from "@/app/ui/dashboard/tournamentsPage/TournamentsPage";
import Link from "next/link";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const DeleteTournamentPage = ({ params }: { params: { id: string } }) => {
    const [deletionSuccessful, setDeletionSuccessful] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tournamentData, setTournamentData] = useState<any>(null);

    const ID = params.id;
    const handleDeleteTournament = async () => {
        const res = await deleteTournament(ID);
        if (res) {
            setDeletionSuccessful(true);
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
            <ShowTournamentDetails tournamentID={ID} />
            <div className="tw-flex tw-mt-4 tw-gap-4">
                {isLoading ? (
                    <BeatLoader color="#F2CA16" />
                ) : deletionSuccessful ? (
                    <div>Tournament Deleted</div>
                ) : (
                    <div>
                        <p>Are you sure you want to delete?</p>
                        <button
                            className="btn-transparent-red"
                            onClick={handleDeleteTournament}
                        >
                            DELETE TOURNAMENT
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteTournamentPage;
