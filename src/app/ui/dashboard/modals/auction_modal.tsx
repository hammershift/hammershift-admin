"use client";

import React, { useEffect, useState } from "react";

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
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-30">
      <div className="w-[600px] flex flex-col">
        <button
          className="text-white text-xl place-self-end rounded-full border-2 w-8 hover:bg-yellow-400"
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
    <div className="section-container border-2 mt-4">
      <h2 className="font-bold m-4 text-yellow-500">AUCTION DETAILS</h2>
      {isLoading ? (
        <div className="flex justify-center items-center">
          <FadeLoader color="rgba(92, 92, 95, 1)" />
        </div>
      ) : (
        <div className="flex flex-col justify-between">
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4 onClick={() => console.log(data)}>AUCTION ID:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.auction_id}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>PRICE:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[0].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>YEAR:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[1].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>MAKE:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[2].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>MODEL:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[3].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>CATEGORY:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[4].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>LOCATION:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[8].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>DEADLINE:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[12].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>CURRENT BIDS:</h4>
            <p>
              {data &&
                Array.isArray(data.attributes) &&
                data.attributes.length > 0 &&
                data.attributes[13].value}
            </p>
          </div>
          <div className="flex justify-between w-auto mx-4 my-2">
            <h4>STATUS:</h4>
            <p>
              {data && data.isActive ? (
                <p className="text-green-400">Active</p>
              ) : (
                <p className="text-red-600">Inactive</p>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
