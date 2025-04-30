"use client";
import { getOneWager, editWagerWithId, refundWager } from "@/app/lib/data";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const DeleteWager = ({ params }: { params: { id: string } }) => {
  const [wagerData, setWagerData] = useState<any>({});
  const [refundInitiated, setRefundInitiated] = useState(false);
  const ID = params.id;
  const router = useRouter();

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
    console.log(ID);
    fetchData();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await editWagerWithId(ID, { isActive: false });
    if (res) {
      alert("Wager Deleted");
      router.push("/dashboard/wagers");
    } else {
      alert("Unauthorized Wager Delete");
    }
  };

  const handleRefund = async () => {
    try {
      if (!refundInitiated) {
        setRefundInitiated(true);
        await editWagerWithId(ID, { isActive: false });
        await refundWager(ID);
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      setRefundInitiated(false);
    }
  };

  return (
    <div className="section-container mt-4">
      <Link href={`/dashboard/wagers`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="font-bold m-4 text-yellow-500">DeleteWager</h2>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>WAGER ID:</h4>
        <p>{wagerData._id}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>PRICE GUESSED:</h4>
        <p>${wagerData.priceGuessed}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>WAGER AMOUNT:</h4>
        <p>${wagerData.wagerAmount}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>USERNAME:</h4>
        <p>{wagerData && wagerData.user && wagerData.user.username}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>USER ID:</h4>
        <p>{wagerData && wagerData.user && wagerData.user._id}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <h4>AUCTION ID:</h4>
        <p>{wagerData.auctionID}</p>
      </div>
      <div className="flex justify-between w-1/3 mx-4 my-2">
        <button className="btn-transparent-red" onClick={handleSubmit}>
          DELETE WAGER
        </button>
        <button
          disabled={wagerData.refunded || refundInitiated}
          onClick={handleRefund}
          className={`border rounded px-3.5 py-1.5 ${
            wagerData.refunded
              ? "bg-white text-black font-bold"
              : "hover:bg-white hover:text-black font-medium"
          }`}
        >
          {wagerData.refunded ? "REFUNDED" : "REFUND"}
        </button>
      </div>
    </div>
  );
};

export default DeleteWager;
