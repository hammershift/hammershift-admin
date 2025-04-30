"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOneWager, editWagerWithId } from "@/app/lib/data";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const EditWager = ({ params }: { params: { id: string } }) => {
  const [data, setData] = useState<any>(null);
  const [newData, setNewData] = useState<any>({});
  const router = useRouter();
  const ID = params.id;

  // fetches data from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getOneWager(ID);
        if (data) {
          console.log(data);
          setData(data);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setNewData({ ...newData, [name]: value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await editWagerWithId(ID, newData);
    if (res) {
      alert("Wager Edit Successful");
      router.push("/dashboard/wagers");
    } else {
      alert("Unauthorized Wager Edit");
    }
  };

  // To be removed, checking for data to edit
  useEffect(() => {
    console.log(newData);
  }, [newData]);

  return (
    <div className="section-container mt-4">
      <Link href={`/dashboard/wagers`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="font-bold m-4 text-yellow-500">EDIT WAGER</h2>{" "}
      {data && (
        <form>
          <div className="flex flex-col gap-4 m-6">
            <div className="flex justify-between w-2/5">
              <label className="px-6">WAGER ID:</label>
              <input
                type="text"
                name="_id"
                value={data?._id || ""}
                className="bg-[#fff]/20 text-white/50 border-yellow-500 border-2 px-1"
                disabled
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">USER ID:</label>
              <input
                name="userID"
                type="text"
                defaultValue={data?.user._id || ""}
                className="bg-[#fff]/20 text-white/50 border-yellow-500 border-2 px-1"
                onChange={handleChange}
                disabled
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">AUCTION ID:</label>
              <input
                name="auctionID"
                type="text"
                defaultValue={data?.auctionID || ""}
                className="bg-[#fff]/20 text-white/50 border-yellow-500 border-2 px-1"
                onChange={handleChange}
                disabled
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Full Name:</label>
              <input
                name="fullName"
                type="text"
                defaultValue={data?.user.fullName || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Username:</label>
              <input
                name="username"
                type="text"
                defaultValue={data?.user.username || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Price Guessed:</label>
              <input
                name="priceGuessed"
                type="number"
                defaultValue={data?.priceGuessed || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex justify-between w-2/5">
              <label className="px-6">Wager Amount:</label>
              <input
                name="wagerAmount"
                type="number"
                defaultValue={data?.wagerAmount || ""}
                className="bg-[#fff]/20 border-yellow-500 border-2 px-1"
                onChange={handleChange}
              />
            </div>
            <div className="flex gap-1 justify-evenly w-2/5 m-4">
              <Link href={`/dashboard/users/delete_user/${ID}`}>
                <button className="btn-transparent-red">DELETE WAGER</button>
              </Link>
              <button
                className="btn-transparent-white"
                type="submit"
                onClick={handleSubmit}
              >
                Save Changes
              </button>
              {/*
                        <button
                            className="btn-transparent-white"
                            onClick={revertChanges}
                        >
                            REVERT CHANGES
                        </button> */}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default EditWager;
