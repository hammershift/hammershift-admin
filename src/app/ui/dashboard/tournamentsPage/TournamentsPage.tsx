import { getAuctionsForTournaments, getTournamentData } from "@/app/lib/data";
import { set } from "mongoose";
import React, { useEffect, useState } from "react";
import { AuctionType } from "@/app/types/auctionTypes";
import { TournamentType } from "@/app/types/tournamentTypes";
import { BeatLoader, BounceLoader } from "react-spinners";
import { DateTime } from "luxon";
import { SelectedDataType } from "@/app/ui/dashboard/createTournament/CreateTournament";

const TournamentsPage = () => {
  return <div>TournamentsPage</div>;
};

export default TournamentsPage;

export const AuctionIDDropdown = ({
  tournamentID,
}: {
  tournamentID: string;
}) => {
  const [auctions, setAuctions] = useState<AuctionType[]>([]);
  const [auctionsLoading, setAuctionsLoading] = useState<boolean>(false);

  // fetch Auctions for Tournament
  useEffect(() => {
    const fetchAuctionsOfTournament = async (id: string) => {
      setAuctionsLoading(true);
      try {
        const res = await getAuctionsForTournaments(id);
        if (res) {
          const data = await res.json();
          setAuctions(data.auctions);
          setAuctionsLoading(false);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchAuctionsOfTournament(tournamentID);
  }, []);

  useEffect(() => {
    console.log("tournament auctions:", auctions);
  }, [auctions]);

  return (
    <div className="absolute transform -translate-x-1/2 p-4 bg-[#1A2C3D] h-[500px] w-[400px] overflow-scroll">
      {auctionsLoading ? (
        <div className=" flex h-[200px] justify-center items-center">
          <BounceLoader color="#F2CA16" />
        </div>
      ) : auctions ? (
        auctions.map((item, index) => {
          const yearAttribute = item.attributes.find(
            (attr) => attr.key === "year"
          );
          const makeAttribute = item.attributes.find(
            (attr) => attr.key === "make"
          );
          const modelAttribute = item.attributes.find(
            (attr) => attr.key === "model"
          );

          const year = yearAttribute ? yearAttribute.value : "";
          const make = makeAttribute ? makeAttribute.value : "";
          const model = modelAttribute ? modelAttribute.value : "";
          const title = `${year} ${make} ${model}`;
          return (
            <div key={item._id + "Auctions"}>
              <TournamentAuctionsCard
                _id={item._id}
                title={title}
                deadline={item.sort.deadline}
                auction_id={item.auction_id}
                image={item.image}
              />
            </div>
          );
        })
      ) : (
        <div>
          <BeatLoader color="#F2CA16" />
        </div>
      )}
    </div>
  );
};

export const ShowTournamentDetails = ({
  tournamentID,
  labelString,
}: {
  tournamentID: string;
  labelString: string;
}) => {
  const [auctions, setAuctions] = useState<AuctionType[]>([]);
  const [tournamentData, setTournamentData] = useState<TournamentType | null>(
    null
  );

  // fetch Tournament Data
  useEffect(() => {
    const fetchTournamentData = async () => {
      const res = await getTournamentData(tournamentID);
      if (res) {
        setTournamentData(res);
      }
    };

    fetchTournamentData();
  }, []);

  // fetch Auctions for Tournament
  useEffect(() => {
    const fetchAuctionsOfTournament = async (id: string) => {
      try {
        const res = await getAuctionsForTournaments(id);
        if (res) {
          const data = await res.json();
          console.log("data:", data.auctions);
          setAuctions(data.auctions);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchAuctionsOfTournament(tournamentID);
  }, []);

  if (tournamentData == null) {
    return (
      <div className="w-full h-[350px] flex justify-center items-center">
        <BounceLoader color="#F2CA16" />
      </div>
    );
  }

  return (
    <div className="w-full 2xl:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
      <div>
        <div className="grid grid-cols-2 h-auto gap-4">
          <div className="font-bold">Tournament Id:</div>
          <p className="px-3 truncate">{tournamentData._id}</p>
          <div className="font-bold">Title:</div>
          <p className="px-3">{tournamentData.title}</p>
          <div className="font-bold">Buy-In Fee:</div>
          <p className="px-3">{tournamentData.buyInFee}</p>
          <div className="font-bold">Start Time:</div>
          <p className="px-3">
            {DateTime.fromISO(tournamentData.startTime).toFormat(
              "MM/dd/yy hh:mm a"
            )}
          </p>
          <div className="font-bold">End Time:</div>
          <p className="px-3">
            {DateTime.fromISO(tournamentData.endTime).toFormat(
              "MM/dd/yy hh:mm a"
            )}
          </p>
          <div className="font-bold">Tournament End Time:</div>
          <p className="px-3">
            {DateTime.fromISO(tournamentData.tournamentEndTime).toFormat(
              "MM/dd/yy hh:mm a"
            )}
          </p>
          <div className="font-bold">Pot:</div>
          <p className="px-3">{tournamentData.pot}</p>
          <div className="font-bold">isActive:</div>
          <p className="px-3">
            {tournamentData.isActive == true ? "true" : "false"}
          </p>
          <div className="font-bold">Status:</div>
          <p className="px-3">{tournamentData.status}</p>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row">
        <div className="font-bold">Auctions:</div>
        <div className="px-0 lg:px-3">
          <div className="">
            {auctions ? (
              auctions.map((item, index) => {
                const yearAttribute = item.attributes.find(
                  (attr) => attr.key === "year"
                );
                const makeAttribute = item.attributes.find(
                  (attr) => attr.key === "make"
                );
                const modelAttribute = item.attributes.find(
                  (attr) => attr.key === "model"
                );

                const year = yearAttribute ? yearAttribute.value : "";
                const make = makeAttribute ? makeAttribute.value : "";
                const model = modelAttribute ? modelAttribute.value : "";
                const title = `${year} ${make} ${model}`;
                return (
                  <div key={item._id + labelString}>
                    <TournamentAuctionsCard
                      _id={item._id}
                      title={title}
                      deadline={item.sort.deadline}
                      auction_id={item.auction_id}
                      image={item.image}
                    />
                  </div>
                );
              })
            ) : (
              <div>
                <BeatLoader color="#F2CA16" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TournamentAuctionsCard: React.FC<SelectedDataType> = ({
  _id,
  title,
  deadline,
  auction_id,
  image,
}) => {
  return (
    <div className="flex flex-col rounded">
      <div className="flex gap-4 py-5">
        <img
          src={image}
          alt={title}
          width={100}
          height={100}
          className="w-[100px] h-[100px] object-cover cursor-pointer"
        />
        <div className="flex flex-col text-start gap-2">
          <div>
            Auction ID: <span>{auction_id}</span>
          </div>
          <div>
            Title: <span>{title}</span>
          </div>
          <div>
            Deadline:{" "}
            <span>
              {DateTime.fromISO(deadline).toFormat("MM/dd/yy hh:mm a")}
            </span>
          </div>
        </div>
      </div>
      <div className="h-[2px] w-full bg-white/20"></div>
    </div>
  );
};
