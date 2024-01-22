"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getOneAuction } from "@/app/lib/data";
import { FadeLoader } from "react-spinners";

interface AuctionModalProps {
  isOpen: boolean;
  onClose: Function;
  id: string;
}

const AuctionModal: React.FC<AuctionModalProps> = ({ isOpen, onClose, id }) => {
  if (!isOpen) {
    return null;
  }
  return (
    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center">
      <div className="tw-w-[600px] tw-flex tw-flex-col">
        <button
          className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
          onClick={() => onClose()}
        >
          x
        </button>
        <ShowModal params={{ id }} />
      </div>
    </div>
  );
};

export default AuctionModal;

const ShowModal = ({ params }: { params: { id: string } }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const id = params.id;

  // fetches data from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getOneAuction(id);
        setIsLoading(true);
        console.log(data);
        if (data) {
          setData(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="section-container tw-border-2 tw-mt-4">
      <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
        AUCTION DETAILS
      </h2>
      {isLoading ? (
        <div className="tw-flex tw-justify-center tw-items-center">
          <FadeLoader color="rgba(92, 92, 95, 1)" />
        </div>
      ) : (
        <div className="tw-flex tw-flex-col tw-justify-between">
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4 onClick={() => console.log(data)}>AUCTION ID:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.auction_id}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>PRICE:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[0].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>YEAR:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[1].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>MAKE:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[2].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>MODEL:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[3].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>CATEGORY:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[4].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>LOCATION:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[8].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>DEADLINE:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[12].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>CURRENT BIDS:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[13].value}
            </p>
          </div>
          <div className="tw-flex tw-justify-between tw-w-auto tw-mx-4 tw-my-2">
            <h4>STATUS:</h4>
            <p>
              {data && data.isActive ? (
                <p className="tw-text-green-400">Active</p>
              ) : (
                <p className="tw-text-red-600">Inactive</p>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
