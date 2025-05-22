"use client";

import React, { useEffect, useState } from "react";
import {
  deleteUserWithId,
  editUserWithId,
  getUsersWithSearch,
} from "@/app/lib/data";
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
import { Ban, Edit, LockOpen, Search, Trash2 } from "lucide-react";
import { Label } from "@/app/ui/components/label";
import { Input } from "@/app/ui/components/input";
import ResponsivePagination from "react-responsive-pagination";
import "react-responsive-pagination/themes/minimal-light-dark.css";

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
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (currentPage: number) => void;
}

const UsersPage = () => {
  const [userData, setUserData] = useState<UserData[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [displayCount, setDisplayCount] = useState(5);
  const [didAction, setDidAction] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await getUsersWithSearch({
        search: searchValue,
        offset: (currentPage - 1) * displayCount,
        limit: displayCount,
      });

      if (data && "users" in data) {
        setTotalUsers(data.total);
        setTotalPages(data.totalPages);
        setUserData(data.users as UserData[]);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchValue]);

  useEffect(() => {
    if (didAction) {
      fetchData();
      setDidAction(false);
    }
  }, [didAction]);

  const deleteUser = async (_id: string) => {
    try {
      const res = await deleteUserWithId(_id);

      if (res && res.status === 200) {
        setDidAction(true);
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
        setDidAction(true);
        if (newBannedStatus) alert("User Banned Successfully");
        else alert("User Unbanned Successfully");
      }
    } catch (error) {
      alert("Error banning/unbanning user");
    }
  };

  return (
    <UserTable
      userData={userData}
      deleteUser={deleteUser}
      banUser={banUser}
      setUserData={setUserData}
      setSearchValue={setSearchValue}
      isLoading={isLoading}
      currentPage={currentPage}
      totalPages={totalPages}
      setCurrentPage={setCurrentPage}
    />
  );
};

export default UsersPage;

const UserTable: React.FC<UsersPageProps> = ({
  userData,
  deleteUser,
  banUser,
  setUserData,
  setSearchValue,
  isLoading,
  currentPage,
  totalPages,
  setCurrentPage,
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
    <div className="section-container mt-4">
      <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-yellow-500">
              Users
            </CardTitle>
            <CardDescription>Manage user accounts</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full block md:table">
            <div className="bg-[#1E2A36] relative h-auto flex px-2 py-1.5 rounded gap-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
              <Input
                placeholder="Search by username, name or email"
                className="pl-10 text-white bg-transparent focus:outline-none placeholder:text-white border-none max-md:text-sm"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchValue(e.target.value)
                }
              />
            </div>
            {isLoading ? (
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
                        <div className="flex w-full gap-2">
                          <div className="w-[50%]">
                            <p className="text-xs text-gray-400">Username</p>
                            <p className="text-white text-sm">
                              {user.username}
                            </p>
                          </div>
                          <div className="w-[50%]">
                            <p className="text-xs text-gray-400">Full Name</p>
                            <p className="text-white text-sm">
                              {user.fullName}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Email</p>
                          <p className="text-white text-sm">{user.email}</p>
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
                      <DialogTitle className="text-lg max-md:text-md">
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
      {!isLoading && (
        <div className="mx-auto mb-8 w-1/3">
          <ResponsivePagination
            current={currentPage}
            total={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};
