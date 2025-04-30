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
import { useSession } from "next-auth/react";
import { BounceLoader, BeatLoader } from "react-spinners";

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
  userData: UserData[];
  banUser: (_id: string) => void;
}

const UsersPage = () => {
  const [userData, setUserData] = useState<UserData[]>([]);
  const [searchValue, setSearchValue] = useState<null | string>(null);
  const [userDisplayCount, setUserDisplayCount] = useState(12);
  const [isLoading, setIsLoading] = useState(true);

  // get all users data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getLimitedUsers(userDisplayCount);

        if (data && "users" in data) {
          setUserData(data.users as UserData[]);
          setIsLoading(false);
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
          const userData = await getUsersWithSearch(searchValue);

          if (userData) {
            setUserData(userData.users as UserData[]);
          } else {
            console.error("Unexpected data structure:", userData);
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
    <div className="section-container mt-4">
      <div className="font-bold">Users</div>
      <div className="w-auto my-4 self-center relative">
        <div className="bg-[#fff]/20 h-auto flex px-2 py-1.5 rounded gap-1">
          <Image
            src={magnifyingGlass}
            alt="magnifying glass"
            width={20}
            height={20}
          />
          <input
            placeholder={`Search for users`}
            className="bg-transparent focus:outline-none"
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>
      <div className="my-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-[436px]">
            <BeatLoader color="#F2CA16" />
          </div>
        ) : (
          <Table userData={userData} banUser={banUser} />
        )}
      </div>

      <div className="flex justify-center ">
        <div className="flex items-center gap-4 py-4">
          <button className="btn-transparent-white" onClick={handleLoadMore}>
            Load More
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;

const Table: React.FC<UsersPageProps> = ({ userData, banUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data } = useSession();

  return (
    <div>
      {" "}
      <table className="w-full border-separate border-spacing-y-2 text-center">
        <thead>
          <tr>
            <th className="p-2.5 font-bold">Username</th>
            <th className="p-2.5 font-bold max-md:hidden">Full Name</th>
            <th className="p-2.5 font-bold max-md:hidden">Email</th>
            <th className="p-2.5 font-bold max-md:hidden">State</th>
            <th className="p-2.5 font-bold max-md:hidden">Country</th>
            <th className="p-2.5 font-bold max-md:hidden">Status</th>
            <th className="p-2.5 font-bold">Actions</th>
          </tr>
        </thead>
        <tbody className="w-full">
          {userData &&
            userData.map((item: UserData, index: number) => (
              <tr key={index} className=" rounded-lg bg-[#fff]/5">
                <td className="p-2.5 w-1/8">{item.username}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">{item.fullName}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">{item.email}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">{item.state}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">{item.country}</td>
                <td className="p-2.5 w-1/8 max-md:hidden">
                  {item.isBanned?.toString() == "true" ? (
                    <p className="text-red-700">Banned</p>
                  ) : (
                    <p className="text-green-700">Active</p>
                  )}
                </td>
                <td className="p-2.5 w-1/8">
                  <div className="flex justify-center">
                    {data?.user.role === "guest" ? (
                      <Link href={`/dashboard/users/show_user/${item._id}`}>
                        <DvrIcon />
                      </Link>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <Link href={`/dashboard/users/edit_user/${item._id}`}>
                          <EditIcon />
                        </Link>
                        <Link href={`/dashboard/users/show_user/${item._id}`}>
                          <DvrIcon />
                        </Link>
                        <Link href={`/dashboard/users/delete_user/${item._id}`}>
                          <DeleteIcon
                            sx={{
                              color: "#C2451E",
                            }}
                          />
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
                    )}
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
