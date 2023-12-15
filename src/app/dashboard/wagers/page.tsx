"use client";

import React, { useEffect, useState } from "react";
import Search from "@/app/ui/dashboard/search/Search";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import DeleteIcon from "@mui/icons-material/Delete";
import { getWagers } from "@/app/lib/data";
import Link from "next/link";
import Image from "next/image";
import magnifyingGlass from '@/../public/images/magnifying-glass.svg';

interface WagerData {
  _id: string;
  priceGuessed: number;
  wagerAmount: number;
  user: {
    _id: string;
    fullName: string;
    username: string;
  };
  auctionID: string;
}
interface WagersPageProps {
  data: WagerData[];
}

const list = [
  {
    id: "wager1",
    priceGuessed: 5000,
    wagerAmount: 10,
    user: {
      userId: "user1",
      fullName: "samantha jones",
      username: "sam001",
    },
    auctionID: "6576875ba85d4ee4df2ae8e1",
  },
  {
    id: "wager2",
    priceGuessed: 6000,
    wagerAmount: 10,
    user: {
      userId: "user2",
      fullName: "Naruto Uzumaki",
      username: "naruto001",
    },
    auctionID: "6576875ba85d4ee4df2ae888",
  },
  {
    id: "wager2",
    priceGuessed: 7000,
    wagerAmount: 10,
    user: {
      userId: "user3",
      fullName: "sonic the hedgehog",
      username: "sonic001",
    },
    auctionID: "6576875ba85d4ee4df2ae444",
  },
];

const WagersPage = () => {
  const [wagerData, setWagerData] = useState<WagerData[]>([]);

  const fetchData = async () => {
    try {
      const data = await getWagers();
      console.log("Wagers", data);

      if (data && "wagers" in data) {
        console.log(data);
        setWagerData(data.wagers as WagerData[]);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="section-container tw-mt-4">
      <div className="tw-font-bold">Users</div>
      <div className='tw-w-[500px] tw-my-4 tw-self-center tw-relative'>
          <div className='tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1'>
            <Image src={magnifyingGlass} alt='magnifying glass' width={20} height={20}/>
            <input 
              placeholder={`Search for users`} 
              className='tw-bg-transparent focus:tw-outline-none' />
          </div>
        </div>

      <div className="tw-my-4">
        <Table data={wagerData} />
      </div>

      <div className="tw-flex tw-justify-end ">
        <div className="tw-flex tw-items-center tw-gap-4 tw-py-4">
          <button className="btn-transparent-white">prev</button>
          <div className="tw-h-auto">page 1 of 1</div>
          <button className="btn-transparent-white">next</button>
        </div>
      </div>
    </div>
  );
};

export default WagersPage;

const Table: React.FC<WagersPageProps> = ({ data }) => {
  return (
    <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
      <thead>
        <tr>
          <th className="tw-p-2.5 tw-font-bold ">Price Guessed</th>
          <th className="tw-p-2.5 tw-font-bold ">Wager Amount</th>
          <th className="tw-p-2.5 tw-font-bold">Username</th>
          <th className="tw-p-2.5 tw-font-bold">User Id</th>
          <th className="tw-p-2.5 tw-font-bold">Auction Id</th>
          <th className="tw-p-2.5 tw-font-bold">Actions</th>
        </tr>
      </thead>
      <tbody className="tw-w-full">
        {data &&
          data.map((item, index) => (
            <tr key={index} className=" tw-rounded-lg tw-bg-[#fff]/5">
              <td className="tw-p-2.5 tw-w-1/8">${item.priceGuessed}</td>
              <td className="tw-p-2.5 tw-w-1/8">${item.wagerAmount}.00</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.user.username}</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.user._id}</td>
              <td className="tw-p-2.5 tw-w-1/8">{item.auctionID}</td>
              <td className="tw-p-2.5 tw-w-1/8">
                <div className="tw-flex tw-gap-4 tw-justify-center">
                  <Link href={`/dashboard/wagers/edit_wager/${item._id}`}>
                    <EditIcon />
                  </Link>
                  <Link href={`/dashboard/wagers/show_wager/${item._id}`}>
                    <DvrIcon />
                  </Link>
                  <Link href={`/dashboard/wagers/delete_wager/${item._id}`}>
                    <DeleteIcon sx={{ color: "#C2451E" }} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};
