"use client";
import { useEffect, useState } from "react";
import { SelectedDataType } from "../createTournament/CreateTournament";

//types / interfaces
import { TournamentObjectType } from "@/app/types/tournamentTypes";
import { BeatLoader } from "react-spinners";
import { DateTime } from "luxon";

// convert date string to date time
function convertDateStringToDateTime(dateString: string | Date) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedData: SelectedDataType[];
  data: TournamentObjectType;
  successfullyPosted: boolean;
  handleCreateTournament: () => Promise<{ message: string }>;
  createTournamentLoading: boolean;
  unsuccessfulPosting: boolean;
}

const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  onClose,
  selectedData,
  data,
  successfullyPosted,
  handleCreateTournament,
  createTournamentLoading,
  unsuccessfulPosting,
}) => {
  if (!isOpen) {
    return null;
  }

  const startTimeString = DateTime.fromISO(data.startTime as string).toFormat(
    "MM/dd/yy hh:mm a"
  );
  const endTimeString = DateTime.fromISO(data.endTime as string).toFormat(
    "MM/dd/yy hh:mm a"
  );
  const tournamentEndTimeString = DateTime.fromISO(
    data.tournamentEndTime as string
  ).toFormat("MM/dd/yy hh:mm a");

  return (
    <div className="fixed max-h-screen overflow-scroll inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-30">
      <div className="w-[800px] pt-64 md:pt-0 flex flex-col">
        <button
          className="text-white text-xl place-self-end rounded-full border-2 w-8 hover:bg-yellow-400"
          onClick={() => onClose()}
        >
          x
        </button>
        <div className="flex flex-col gap-2 p-4 bg-[#1A2C3D] rounded-lg border-2 mt-4">
          <h2 className="font-bold text-yellow-500">TOURNAMENT DETAILS</h2>
          <div>
            <div className="font-bold text-lg">Title : {data.title}</div>
            <div>Start Time : {startTimeString}</div>
            <div>End Time : {endTimeString}</div>
            <div>Buy-In Fee : {data.buyInFee}</div>
            <div>Tournament End Time : {tournamentEndTimeString}</div>
            <div>Auctions : </div>
            <div className="grid grid-cols-1 md:grid-cols-2 mt-2">
              {selectedData != null &&
                selectedData.map((item) => {
                  const deadlineString = convertDateStringToDateTime(
                    item.deadline
                  );
                  return (
                    <div key={item._id + "SD"}>
                      <AuctionsCard
                        _id={item._id}
                        title={item.title}
                        deadline={deadlineString}
                        auction_id={item.auction_id}
                        image={item.image}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="bg-white/10 h-[2px] my-2"></div>
          {createTournamentLoading ? (
            <div className="w-full h-[60px] flex justify-center items-center">
              <BeatLoader color="#F2CA16" />
            </div>
          ) : successfullyPosted ? (
            <div className="bg-[#F2CA16] p-2 text-black text-xl font-bold text-center ">
              Tournament Successfully Posted! 🎉
            </div>
          ) : (
            <>
              {unsuccessfulPosting && (
                <div className="text-red-600">
                  Unsucessful Posting. Please try again...
                </div>
              )}
              <div className="flex flex-col gap-3">
                <div>Post Tournament?</div>
                <div className="flex gap-4">
                  <button onClick={() => onClose()}>Cancel</button>
                  <button
                    onClick={() => handleCreateTournament()}
                    className="btn-yellow"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentModal;

const AuctionsCard: React.FC<SelectedDataType> = ({
  _id,
  title,
  deadline,
  auction_id,
  image,
}) => {
  const dateTime = convertDateStringToDateTime(deadline);

  return (
    <div className="w-full h-full flex gap-4 border-solid border-2 border-white border p-2 rounded">
      <img
        src={image}
        alt={title}
        width={50}
        height={50}
        className="w-[100px] h-[100px] object-cover"
      />
      <div className="grid">
        <div>
          Auction ID: <span>{auction_id}</span>
        </div>
        <div className="truncate">
          Title: <span>{title}</span>
        </div>
        <div className="truncate">
          Deadline: <span>{dateTime}</span>
        </div>
      </div>
    </div>
  );
};
