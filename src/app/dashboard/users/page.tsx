"use client";

import React, { useEffect, useState } from "react";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import {
  deleteUserWithId,
  editUserWithId,
  getLimitedUsers,
  getUsersWithSearch,
} from "@/app/lib/data";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { BeatLoader } from "react-spinners";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/ui/components/dialog";
import { Button } from "@/app/ui/components/button";
import { Ban, Edit, LockOpen, Trash2 } from "lucide-react";
import { Label } from "@/app/ui/components/label";
import { Input } from "@/app/ui/components/input";

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
  deleteUser: (_id: string) => Promise<void>;
  banUser: (_id: string, newBannedStatus: boolean) => Promise<void>;
  setUserData: (userData: UserData[]) => void;
  setSearchValue: (searchValue: string) => void;
  isSearching: boolean;
}

const UsersPage = () => {
  const [userData, setUserData] = useState<UserData[]>([]);
  const [searchValue, setSearchValue] = useState<null | string>(null);
  const [userDisplayCount, setUserDisplayCount] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

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

  // get all users data
  useEffect(() => {
    fetchData();
  }, [userDisplayCount]);

  // get users data with search value
  useEffect(() => {
    console.log("searchValue:", searchValue);
    const getDataWithSearchValue = async () => {
      setIsSearching(true);
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
      } else fetchData();
      setIsSearching(false);
    };
    getDataWithSearchValue();
  }, [searchValue]);

  const deleteUser = async (_id: string) => {
    try {
      const res = await deleteUserWithId(_id);

      if (res && res.status === 200) {
        console.log(userData);
        setUserData(userData.filter((user) => user._id !== _id));
        alert("User Deleted Successfully");
      }
    } catch (error) {
      alert("Error banning/unbanning user");
    }
  };

  const banUser = async (_id: string, newBannedStatus: boolean) => {
    try {
      const updatedUser = { isBanned: newBannedStatus };
      const res = await editUserWithId(_id, updatedUser);

      if (res && res.status === 200) {
        console.log(userData);
        setUserData(
          userData.map((user) =>
            user._id === _id ? { ...user, ...updatedUser } : user
          )
        );
        if (newBannedStatus) alert("User Banned Successfully");
        else alert("User Unbanned Successfully");
      }
    } catch (error) {
      alert("Error banning/unbanning user");
    }
  };

  const handleLoadMore = () => {
    setUserDisplayCount((prevCount) => prevCount + 7);
  };

  return (
    <div className="section-container mt-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-[436px]">
          <BeatLoader color="#F2CA16" />
        </div>
      ) : (
        <UserTable
          userData={userData}
          deleteUser={deleteUser}
          banUser={banUser}
          setUserData={setUserData}
          setSearchValue={setSearchValue}
          isSearching={isSearching}
        />
      )}
    </div>
  );
};

export default UsersPage;

const UserTable: React.FC<UsersPageProps> = ({
  userData,
  deleteUser,
  banUser,
  setUserData,
  setSearchValue,
  isSearching,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData>();
  const [bannedStatus, setBannedStatus] = useState<boolean>(false);

  const { data } = useSession();

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (name) setSelectedUser({ ...selectedUser!, [name]: value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await editUserWithId(selectedUser!._id, selectedUser);
    if (res && res.status === 200) {
      alert("User Edit Successful");
      const updatedUser = res.user;
      setUserData(
        userData.map((user) =>
          user._id === updatedUser._id ? { ...user, ...updatedUser } : user
        )
      );
      setShowEditModal(false);
    } else {
      alert("Unauthorized User Edit");
      console.error("unauthorized", res);
      setShowEditModal(false);
    }
  };

  return (
    <div>
      <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-yellow-500">
            Users
          </CardTitle>
          <CardDescription>Manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full block md:table">
            <div className="w-auto mb-4 self-center relative">
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
            {isSearching ? (
              <div className="flex justify-center items-center h-[436px]">
                <BeatLoader color="#F2CA16" />
              </div>
            ) : (
              <div>
                <div className="block md:hidden space-y-4">
                  {userData &&
                    userData.map((user: UserData, index: number) => (
                      <div
                        key={index}
                        className="bg-[#13202D] border-2 border-[#1E2A36] rounded-xl p-4 space-y-2"
                      >
                        <div>
                          <p className="text-xs text-gray-400">Username</p>
                          <p className="text-white">{user.username}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Full Name</p>
                          <p className="text-white">{user.fullName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Email</p>
                          <p className="text-white">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Status</p>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.isBanned
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.isBanned ? "Banned" : "Active"}
                          </span>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={""}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={"text-red-700"}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={"text-yellow-500"}
                            onClick={() => {
                              setSelectedUser(user);
                              setBannedStatus(user.isBanned);
                              setShowBanModal(true);
                            }}
                          >
                            {user.isBanned ? (
                              <LockOpen className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Ban className="h-4 w-4 text-yellow-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-yellow-500/90">
                          Username
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Full Name
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Email
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-yellow-500/90">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userData &&
                        userData.map((user: UserData, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {user.username}
                            </TableCell>
                            <TableCell className="font-medium">
                              {user.fullName}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <div
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  user.isBanned
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {user.isBanned ? "Banned" : "Active"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit User"
                                  className={""}
                                  onClick={() => {
                                    setShowEditModal(true);
                                    setSelectedUser(user);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={"text-red-700"}
                                  title={"Delete User"}
                                  onClick={() => {
                                    setShowDeleteModal(true);
                                    setSelectedUser(user);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={"text-yellow-500"}
                                  title={`${
                                    user.isBanned ? "Unban" : "Ban"
                                  } User`}
                                  onClick={() => {
                                    setShowBanModal(true);
                                    setSelectedUser(user);
                                    setBannedStatus(user.isBanned);
                                  }}
                                >
                                  {user.isBanned ? (
                                    <LockOpen className="h-4 w-4" />
                                  ) : (
                                    <Ban className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {selectedUser && (
              <div className="flex items-center gap-1 mx-4">
                <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="max-md:text-md">
                        Edit User
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        Update user information for {selectedUser!.username}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Username
                        </Label>
                        <Input
                          className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                          name="username"
                          type="text"
                          value={selectedUser?.username || ""}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Full Name
                        </Label>
                        <Input
                          className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                          name="fullName"
                          type="text"
                          value={selectedUser?.fullName || ""}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right max-md:text-xs">
                          Email
                        </Label>
                        <Input
                          defaultValue={selectedUser!.email}
                          className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                          name="email"
                          type="text"
                          value={selectedUser?.email || ""}
                          onChange={handleChange}
                        />
                      </div>
                      {/* <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Status</Label>
                        <select
                          value={selectedUser!.isBanned ? "banned" : "active"}
                          className="col-span-3 bg-[#1E2A36] border border-[#1E2A36] rounded-md p-2"
                        >
                          <option value="active">Active</option>
                          <option value="banned">Banned</option>
                        </select>
                      </div> */}
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2">
                      <form onSubmit={handleSubmit}>
                        <Button
                          type="submit"
                          className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                        >
                          Save Changes
                        </Button>
                      </form>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={showDeleteModal}
                  onOpenChange={setShowDeleteModal}
                >
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-red-700 text-lg max-md:text-md">
                        Delete User
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-red-700">
                          {selectedUser!.username}
                        </span>
                        ?
                      </DialogDescription>
                    </DialogHeader>

                    <div className="p-2 m-2 text-sm">
                      <p className="text-lg max-md:text-md font-bold text-red-700 text-center">
                        Warning
                      </p>
                      <p className={"text-justify max-md:text-sm"}>
                        {
                          "By deleting this account, this user will have their data deleted from the Hammershift / Velocity Market App's database"
                        }
                      </p>
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await deleteUser(selectedUser!._id).then(() =>
                            setShowDeleteModal(false)
                          );
                        }}
                      >
                        <Button
                          type="submit"
                          className="bg-red-700 text-[#0C1924] hover:bg-red-700/90"
                        >
                          Delete
                        </Button>
                      </form>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showBanModal} onOpenChange={setShowBanModal}>
                  <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-yellow-500 text-lg max-md:text-md">
                        {bannedStatus ? "Unban " : "Ban "} User
                      </DialogTitle>
                      <DialogDescription className="max-md:text-sm">
                        Are you sure you want to{" "}
                        {bannedStatus ? "unban " : "ban "}
                        <span className="font-semibold text-yellow-400">
                          {selectedUser!.username}
                        </span>
                        ?
                      </DialogDescription>
                    </DialogHeader>

                    <div className="p-2 m-2 text-sm">
                      <p className="text-lg max-md:text-md font-bold text-yellow-500 text-center">
                        Warning
                      </p>
                      <p className={"text-justify max-md:text-sm"}>
                        {bannedStatus
                          ? "By unbanning this account, this user WILL HAVE ACCESS again to the Hammershift / Velocity Market App"
                          : "By banning this account, this user WILL NO LONGER HAVE ACCESS to the Hammershift / Velocity Market App"}
                      </p>
                    </div>
                    <DialogFooter className="flex-row justify-end space-x-2">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          await banUser(selectedUser!._id, !bannedStatus).then(
                            () => setShowBanModal(false)
                          );
                        }}
                      >
                        <Button
                          type="submit"
                          className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                        >
                          Confirm
                        </Button>
                      </form>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
