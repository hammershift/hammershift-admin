"use client";
import { getOneWager } from "@/app/lib/data";
import React, { useState, useEffect } from "react";
import Link from "next/link";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useSession } from "next-auth/react";

const ShowWager = ({ params }: { params: { id: string } }) => {
  const [wagerData, setWagerData] = useState<any>(null);
  const ID = params.id;

  const { data } = useSession();

  // fetches data from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getOneWager(ID);
        console.log(data);
        if (data) {
          setWagerData(data);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="section-container w-auto mt-4">
      <Link href={`/dashboard/wagers`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="font-bold m-4 text-yellow-500">WAGER DETAILS</h2>{" "}
      <div className="flex flex-col">
        <div className="flex justify-between w-1/2 mx-4 my-2 max-lg:w-full">
          <h4>WAGER ID:</h4>
          <p className="px-3">{wagerData && wagerData._id}</p>
        </div>
        <div className="flex justify-between w-1/2  mx-4 my-2 max-lg:w-full">
          <h4>USER ID:</h4>
          <p className="px-3">{wagerData && wagerData.user._id}</p>
        </div>
        <div className="flex justify-between w-1/2  mx-4 my-2 max-lg:w-full">
          <h4>AUCTION ID:</h4>
          <p className="px-3">{wagerData && wagerData.auctionIdentifierId}</p>
        </div>
        <div className="flex justify-between w-1/2  mx-4 my-2 max-lg:w-full">
          <h4>Full Name:</h4>
          <p className="px-3">{wagerData && wagerData.user.fullName}</p>
        </div>
        <div className="flex justify-between w-1/2  mx-4 my-2 max-lg:w-full">
          <h4>Username:</h4>
          <p className="px-3">{wagerData && wagerData.user.username}</p>
        </div>
        <div className="flex justify-between w-1/2  mx-4 my-2 max-lg:w-full">
          <h4>Price Guessed:</h4>
          <p className="px-3">${wagerData && wagerData.priceGuessed}</p>
        </div>
        <div className="flex justify-between w-1/2  mx-4 my-2 max-lg:w-full">
          <h4>Wager Amount:</h4>
          <p className="px-3">${wagerData && wagerData.wagerAmount}</p>
        </div>
      </div>
      {data?.user?.role !== "guest" && data?.user?.role !== "moderator" ? (
        <div className="flex gap-1 justify-evenly w-1/2 m-4 max-lg:w-full">
          {/* <Link href={`/dashboard/wagers/edit_wager/${ID}`}>
                        <button className="btn-transparent-white ">
                            EDIT WAGER
                        </button>
                    </Link> */}
          <Link href={`/dashboard/wagers/delete_wager/${ID}`}>
            <button className="btn-transparent-red">DELETE WAGER</button>
          </Link>
        </div>
      ) : null}
    </div>
  );
};

export default ShowWager;
