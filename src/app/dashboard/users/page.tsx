"use client";

import React, { useEffect, useState } from "react";
import Search from "@/app/ui/dashboard/search/Search";
import EditIcon from "@mui/icons-material/Edit";
import DvrIcon from "@mui/icons-material/Dvr";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import {
  editUserWithId,
  getLimitedUsers,
  getUsers,
  getUsersWithSearch,
} from "@/app/lib/data";
import Link from "next/link";
import Image from "next/image";
import BanUserModal from "@/app/ui/dashboard/modals/ban_user_modal";

interface UserData {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  state: string;
  country: string;
  isActive: boolean;
  isBanned: boolean;
}
interface UsersPageProps {
  data: UserData[];
  banUser: (_id: string) => void;
}

const UsersPage = () => {
  const [userData, setUserData] = useState<UserData[]>([]);
  const [searchValue, setSearchValue] = useState<null | string>(null);
  const [userDisplayCount, setUserDisplayCount] = useState(7);

  // get all users data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getLimitedUsers(userDisplayCount);

        if (data && "users" in data) {
          setUserData(data.users as UserData[]);
        } else {
          console.error("Unexpected data structure:", data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [userDisplayCount]);

  // get users data with search value
  useEffect(() => {
    // console.log("searchValue:", searchValue);
    const getDataWithSearchValue = async () => {
      if (searchValue !== null && searchValue !== "") {
        try {
          const data = await getUsersWithSearch(searchValue);

          if (data) {
            setUserData(data.users as UserData[]);
          } else {
            console.error("Unexpected data structure:", data);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    getDataWithSearchValue();
  }, [searchValue]);

  const banUser = async (_id: string) => {
    try {
      const updatedUser = { isBanned: true };
      const res = await editUserWithId(_id, updatedUser);

      if (res && res.message === "Edit Successful") {
        console.log(userData);
        setUserData(
          userData.map((user) =>
            user._id === _id ? { ...user, ...updatedUser } : user
          )
        );
        alert("User Banned Successfully");
      }
    } catch (error) {
      alert("Error banning user");
    }
  };

  const handleLoadMore = () => {
    setUserDisplayCount((prevCount) => prevCount + 7);
  };

  return (
    <div className="section-container tw-mt-4">
      <div className="tw-font-bold">Users</div>
      <div className="tw-w-auto tw-my-4 tw-self-center tw-relative">
        <div className="tw-bg-[#fff]/20 tw-h-auto tw-flex tw-px-2 tw-py-1.5 tw-rounded tw-gap-1">
          <Image
            src={magnifyingGlass}
            alt="magnifying glass"
            width={20}
            height={20}
          />
          <input
            placeholder={`Search for users`}
            className="tw-bg-transparent focus:tw-outline-none"
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>
      <div className="tw-my-4">
        <Table data={userData} banUser={banUser} />
      </div>

      <div className="tw-flex tw-justify-center ">
        <div className="tw-flex tw-items-center tw-gap-4 tw-py-4">
          <button className="btn-transparent-white" onClick={handleLoadMore}>
            Load More
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;

const Table: React.FC<UsersPageProps> = ({ data, banUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  return (
    <div>
      {" "}
      <table className="tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center">
        <thead>
          <tr>
            <th className="tw-p-2.5 tw-font-bold">Username</th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">
              Full Name
            </th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">Email</th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">State</th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">Country</th>
            <th className="tw-p-2.5 tw-font-bold max-md:tw-hidden">Status</th>
            <th className="tw-p-2.5 tw-font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="tw-w-full">
          {data &&
            data.map((item: UserData, index: number) => (
              <tr key={index} className=" tw-rounded-lg tw-bg-[#fff]/5">
                <td className="tw-p-2.5 tw-w-1/8">{item.username}</td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  {item.fullName}
                </td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  {item.email}
                </td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  {item.state}
                </td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  {item.country}
                </td>
                <td className="tw-p-2.5 tw-w-1/8 max-md:tw-hidden">
                  {item.isBanned.toString() == "true" ? (
                    <p className="tw-text-red-700">Banned</p>
                  ) : (
                    <p className="tw-text-green-700">Active</p>
                  )}
                </td>
                <td className="tw-p-2.5 tw-w-1/8">
                  <div className="tw-flex tw-gap-4 tw-justify-center">
                    <Link href={`/dashboard/users/edit_user/${item._id}`}>
                      <EditIcon />
                    </Link>
                    <Link href={`/dashboard/users/show_user/${item._id}`}>
                      <DvrIcon />
                    </Link>
                    <Link href={`/dashboard/users/delete_user/${item._id}`}>
                      <DeleteIcon sx={{ color: "#C2451E" }} />
                    </Link>
                    <button
                      onClick={() => {
                        setShowModal(true);
                        setSelectedUsername(item.username);
                        setSelectedUserId(item._id);
                      }}
                    >
                      <BlockIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      <BanUserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        username={selectedUsername || ""}
        id={selectedUserId}
        onConfirm={() => banUser(selectedUserId)}
      />
    </div>
  );
};
