import { getTournamentData } from "@/app/lib/data";
import React, { useEffect, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
            <ShowTournamentDetails tournamentData={tournamentData} />
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

const ShowTournamentDetails = ({ tournamentData }: { tournamentData: any }) => {
    return (
        <div className="section-container tw-mt-4">
            <div className="tw-flex tw-flex-col">
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Tournament Id:</h4>
                    <p className="tw-px-3">{tournamentData._id}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Title:</h4>
                    <p className="tw-px-3">{tournamentData.title}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Buy-In Fee:</h4>
                    <p className="tw-px-3">{tournamentData.buyInFee}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Start Time:</h4>
                    <p className="tw-px-3">{tournamentData.startTime}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>End Time:</h4>
                    <p className="tw-px-3">{tournamentData.endTime}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Pot:</h4>
                    <p className="tw-px-3">{tournamentData.pot}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>isActive:</h4>
                    <p className="tw-px-3">
                        {tournamentData.isActive == true ? "true" : "false"}
                    </p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Status:</h4>
                    <p className="tw-px-3">{tournamentData.status}</p>
                </div>
                <div className="tw-flex tw-justify-between tw-w-1/2 tw-mx-4 tw-my-2 max-lg:tw-w-full">
                    <h4>Auctions:</h4>
                    <p className="tw-px-3">{tournamentData.country}</p>
                </div>
            </div>
        </div>
    );
};
