"use client";
import { getOneWager, editWagerWithId } from "@/app/lib/getWagers";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const DeleteWager = ({ params }: { params: { id: string } }) => {
  const [wagerData, setData] = useState<any>({});
  const ID = params.id;
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getOneWager(ID);
        console.log(data);
        if (data) {
          setData(data);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await editWagerWithId(ID, { isActive: false });
    if (res) {
      alert("Wager Edit Successful");
      router.push("/dashboard/wagers");
    } else {
      alert("User Edit Failed");
    }
  };

  return (
    <div className="section-container tw-mt-4">
      <Link href={`/dashboard/wagers`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">DeleteWager</h2>
      <div className="tw-flex tw-justify-between tw-w-1/3 tw-mx-4 tw-my-2">
        <h4>WAGER ID:</h4>
        <p>{wagerData._id}</p>
      </div>
      <div className="tw-flex tw-justify-between tw-w-1/3 tw-mx-4 tw-my-2">
        <h4>PRICE GUESSED:</h4>
        <p>${wagerData.priceGuessed}</p>
      </div>
      <div className="tw-flex tw-justify-between tw-w-1/3 tw-mx-4 tw-my-2">
        <h4>WAGER AMOUNT:</h4>
        <p>${wagerData.wagerAmount}</p>
      </div>
      <div className="tw-flex tw-justify-between tw-w-1/3 tw-mx-4 tw-my-2">
        <h4>USERNAME:</h4>
        <p>{wagerData && wagerData.user && wagerData.user.username}</p>
      </div>
      <div className="tw-flex tw-justify-between tw-w-1/3 tw-mx-4 tw-my-2">
        <h4>USER ID:</h4>
        <p>{wagerData && wagerData.user && wagerData.user._id}</p>
      </div>
      <div className="tw-flex tw-justify-between tw-w-1/3 tw-mx-4 tw-my-2">
        <h4>AUCTION ID:</h4>
        <p>{wagerData.auctionID}</p>
      </div>
      <button className="btn-transparent-red" onClick={handleSubmit}>
        DELETE WAGER
      </button>
    </div>
  );
};

export default DeleteWager;
