"use client";

import React, { useEffect, useState } from "react";
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
import { Badge } from "../../components/badge";
import { Edit, Trash2, UserPlus } from "lucide-react";
import { Button } from "../../components/button";
import { Label } from "../../components/label";
import { Input } from "../../components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/select";
import { useSession } from "next-auth/react";
interface AdminData {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password?: string;
  role: string;
}

interface AdminsPageProps {
  adminData: AdminData[];
  fetchData: () => void;
}

const AdminsPage: React.FC<AdminsPageProps> = ({ adminData, fetchData }) => {
  const defaultAdmin: AdminData = {
    _id: "",
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    password: "",
    role: "",
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData>();
  const [newAdmin, setNewAdmin] = useState<AdminData>(defaultAdmin);
  const [confirmPassword, setConfirmPassword] = useState({
    confirm_password: "",
  });
  const [emptyInputError, setEmptyInputError] = useState(false);
  const [passwordMismatchError, setPasswordMismatchError] = useState(false);
  const [adminInputError, setAdminInputError] = useState(false);
  const [adminInputErrorMessage, setAdminInputErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useSession();
  const [role, setRole] = useState("");

  useEffect(() => {
    if (data?.user?.role) {
      setRole(data.user.role);
    }
  }, [data]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "moderator":
        return "bg-green-100 text-green-800";
      case "guest":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleNewAdminChange = (e: any) => {
    setEmptyInputError(false);
    setPasswordMismatchError(false);
    setAdminInputError(false);
    const { name, value } = e.target;
    if (name) setNewAdmin({ ...newAdmin!, [name]: value });
  };

  const handleNewAdminRoleChange = (role: string) => {
    setNewAdmin({ ...newAdmin!, role: role });
  };

  const handleSelectedAdminChange = (e: any) => {
    setEmptyInputError(false);
    setPasswordMismatchError(false);
    setAdminInputError(false);
    const { name, value } = e.target;
    if (name) setSelectedAdmin({ ...selectedAdmin!, [name]: value });
  };

  const handleSelectedAdminRoleChange = (role: string) => {
    setSelectedAdmin({ ...selectedAdmin!, role: role });
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setConfirmPassword({ confirm_password: e.target.value });
  };

  const handleNewAdminSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (
      !newAdmin.first_name ||
      !newAdmin.last_name ||
      !newAdmin.email ||
      !newAdmin.username ||
      !newAdmin.password ||
      !newAdmin.role ||
      !confirmPassword
    ) {
      setEmptyInputError(true);
    } else if (newAdmin.password !== confirmPassword.confirm_password) {
      setPasswordMismatchError(true);
    } else {
      try {
        const response = await fetch("/api/admins", {
          method: "POST",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify(newAdmin),
        });

        const data = await response.json();
        if (response.status === 400) {
          setAdminInputError(true);
          setAdminInputErrorMessage(data.message);
        } else if (!response.ok) {
          console.error("Error creating admin account");
        } else {
          setConfirmPassword({ confirm_password: "" });
          setNewAdmin(defaultAdmin);
          alert("Admin account created successfully!");
          setShowAddModal(false);
          fetchData();
        }
      } catch (error) {
        return console.error("Internal server error", error);
      }
    }
    setIsSubmitting(false);
  };

  const handleSelectedAdminSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (
      !selectedAdmin?.first_name ||
      !selectedAdmin?.last_name ||
      !selectedAdmin?.email ||
      !selectedAdmin?.username ||
      !selectedAdmin?.role
    ) {
      setEmptyInputError(true);
      setTimeout(() => {
        setEmptyInputError(false);
      }, 1500);
    } else if (selectedAdmin.password !== confirmPassword.confirm_password) {
      setPasswordMismatchError(true);
      setTimeout(() => {
        setPasswordMismatchError(false);
      }, 1500);
    } else {
      try {
        const response = await fetch("/api/admins", {
          method: "PUT",
          headers: { "Content-type": "application/json" },
          body: JSON.stringify(selectedAdmin),
        });

        const data = await response.json();
        if (response.status === 400) {
          setAdminInputError(true);
          setAdminInputErrorMessage(data.message);
          setTimeout(() => {
            setAdminInputError(false);
            setAdminInputErrorMessage("");
          }, 1500);
        } else if (!response.ok) {
          console.error("Error updating admin account");
        } else {
          setConfirmPassword({ confirm_password: "" });
          alert("Admin account updated successfully!");
          setShowEditModal(false);
          fetchData();
        }
      } catch (error) {
        return console.error("Internal server error", error);
      }
    }
    setIsSubmitting(false);
  };

  const handleAdminDelete = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admins", {
        method: "DELETE",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(selectedAdmin),
      });

      await response.json();
      if (!response.ok) {
        console.error("Error deleting admin account");
      } else {
        alert("Admin account delete successfully!");
        setShowDeleteModal(false);
        fetchData();
      }
    } catch (error) {
      return console.error("Internal server error", error);
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      <Card className="bg-[#13202D] border-[#1E2A36] mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-yellow-500">
              Admin List
            </CardTitle>
            <CardDescription>
              Manage administrators and their access levels
            </CardDescription>
          </div>
          {role == "owner" && (
            <Button
              className="bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
              onClick={() => {
                setShowAddModal(true);
                setNewAdmin(defaultAdmin);
                setEmptyInputError(false);
                setPasswordMismatchError(false);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="block md:hidden space-y-4">
            {adminData &&
              adminData.map((admin: AdminData, index: number) => (
                <div
                  key={index}
                  className="bg-[#13202D] border-2 border-[#1E2A36] rounded-xl p-4 space-y-2"
                >
                  <div>
                    <p className="text-xs text-gray-400">First Name</p>
                    <p className="text-white">{admin.first_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Last Name</p>
                    <p className="text-white">{admin.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-white">{admin.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Username</p>
                    <p className="text-white">{admin.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Admin Role</p>
                    <Badge className={getRoleBadgeColor(admin.role)}>
                      {admin.role.charAt(0).toUpperCase() +
                        admin.role.substring(1, admin.role.length)}
                    </Badge>
                  </div>
                  {role == "owner" && (
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={""}
                        onClick={() => {
                          setShowEditModal(true);
                          setSelectedAdmin({ ...admin, password: "" });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={"text-red-700"}
                        onClick={() => {
                          setShowDeleteModal(true);
                          setSelectedAdmin(admin);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
          <div className="hidden md:block overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-yellow-500/90">
                    First Name
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Last Name
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Email
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Username
                  </TableHead>
                  <TableHead className="font-bold text-yellow-500/90">
                    Admin Role
                  </TableHead>
                  {role == "owner" && (
                    <TableHead className="font-bold text-yellow-500/90">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminData &&
                  adminData.map((admin: AdminData, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {admin.first_name}
                      </TableCell>
                      <TableCell className="font-medium">
                        {admin.last_name}
                      </TableCell>
                      <TableCell className="font-medium">
                        {admin.email}
                      </TableCell>
                      <TableCell className="font-medium">
                        {admin.username}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge className={getRoleBadgeColor(admin.role)}>
                          {admin.role.charAt(0).toUpperCase() +
                            admin.role.substring(1, admin.role.length)}
                        </Badge>
                      </TableCell>
                      {role == "owner" && (
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit User"
                              className={""}
                              onClick={() => {
                                setShowEditModal(true);
                                setSelectedAdmin({ ...admin, password: "" });
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
                                setSelectedAdmin(admin);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
              <DialogHeader>
                <DialogTitle className="max-md:text-md">Add Admin</DialogTitle>
                <DialogDescription className="max-md:text-sm">
                  Provide information for new admin
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right max-md:text-xs">
                    First Name
                  </Label>
                  <Input
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                      emptyInputError && newAdmin?.first_name == ""
                        ? "border-red-500"
                        : ""
                    }`}
                    name="first_name"
                    type="text"
                    value={newAdmin?.first_name || ""}
                    onChange={handleNewAdminChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right max-md:text-xs">Last Name</Label>
                  <Input
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                      emptyInputError && newAdmin?.last_name == ""
                        ? "border-red-500"
                        : ""
                    }`}
                    name="last_name"
                    type="text"
                    value={newAdmin?.last_name || ""}
                    onChange={handleNewAdminChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right max-md:text-xs">Email</Label>
                  <Input
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                      emptyInputError && newAdmin?.email == ""
                        ? "border-red-500"
                        : ""
                    }`}
                    name="email"
                    type="email"
                    value={newAdmin?.email || ""}
                    onChange={handleNewAdminChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right max-md:text-xs">Username</Label>
                  <Input
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                      emptyInputError && newAdmin?.username == ""
                        ? "border-red-500"
                        : ""
                    }`}
                    name="username"
                    type="text"
                    value={newAdmin?.username || ""}
                    onChange={handleNewAdminChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right max-md:text-xs">Password</Label>
                  <Input
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                      (emptyInputError && newAdmin?.password == "") ||
                      passwordMismatchError
                        ? "border-red-500"
                        : ""
                    }`}
                    name="password"
                    type="password"
                    value={newAdmin?.password || ""}
                    onChange={handleNewAdminChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right max-md:text-xs">
                    Confirm Password
                  </Label>
                  <Input
                    defaultValue={newAdmin!.email}
                    className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                      (emptyInputError && newAdmin?.password == "") ||
                      passwordMismatchError
                        ? "border-red-500"
                        : ""
                    }`}
                    name="confirm_password"
                    type="password"
                    value={confirmPassword.confirm_password || ""}
                    onChange={handleConfirmPasswordChange}
                  />
                </div>
                <div>
                  <Label className="mb-2 block max-md:text-xs">Role</Label>
                  <Select
                    value={newAdmin?.role || ""}
                    onValueChange={handleNewAdminRoleChange}
                    name="role"
                  >
                    <SelectTrigger
                      className={`bg-[#1E2A36] border-[#1E2A36] ${
                        emptyInputError && newAdmin?.role == ""
                          ? "border-red-500"
                          : ""
                      }`}
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                  {emptyInputError ? (
                    <p className="mt-4 text-red-500 text-center max-md:text-sm">
                      Please fill-out required fields
                    </p>
                  ) : passwordMismatchError ? (
                    <p className="mt-4 text-red-500 text-center max-md:text-sm">
                      Passwords do not match
                    </p>
                  ) : adminInputError ? (
                    <p className="mt-4 text-red-500 text-center max-md:text-sm">
                      {adminInputErrorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
              <DialogFooter className="flex-row justify-end space-x-2">
                <form onSubmit={handleNewAdminSubmit}>
                  <Button
                    type="submit"
                    className={`bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90 ${
                      isSubmitting ? "pointer-events-none opacity-50" : ""
                    }`}
                    aria-disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </form>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {selectedAdmin && (
            <div className="flex items-center gap-1">
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="max-md:text-md">
                      Edit Admin
                    </DialogTitle>
                    <DialogDescription className="max-md:text-sm">
                      Update information for{" "}
                      <span className="font-semibold text-yellow-400">
                        {selectedAdmin!.username}
                      </span>
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        First Name
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError && selectedAdmin?.first_name == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="first_name"
                        type="text"
                        value={selectedAdmin?.first_name || ""}
                        onChange={handleSelectedAdminChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        Last Name
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError && selectedAdmin?.last_name == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="last_name"
                        type="text"
                        value={selectedAdmin?.last_name || ""}
                        onChange={handleSelectedAdminChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">Email</Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError && selectedAdmin?.email == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="email"
                        type="email"
                        value={selectedAdmin?.email || ""}
                        onChange={handleSelectedAdminChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        Username
                      </Label>
                      <Input
                        className={`col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm ${
                          emptyInputError && selectedAdmin?.username == ""
                            ? "border-red-500"
                            : ""
                        }`}
                        name="username"
                        type="text"
                        value={selectedAdmin?.username || ""}
                        onChange={handleSelectedAdminChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        Password
                      </Label>
                      <Input
                        className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                        name="password"
                        type="password"
                        value={selectedAdmin?.password || ""}
                        onChange={handleSelectedAdminChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right max-md:text-xs">
                        Confirm Password
                      </Label>
                      <Input
                        className="col-span-3 bg-[#1E2A36] border-[#1E2A36] max-md:text-sm"
                        name="confirm_password"
                        type="password"
                        value={confirmPassword.confirm_password || ""}
                        onChange={handleConfirmPasswordChange}
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block max-md:text-xs">Role</Label>
                      <Select
                        value={selectedAdmin?.role || ""}
                        onValueChange={handleSelectedAdminRoleChange}
                        name="role"
                      >
                        <SelectTrigger
                          className={`bg-[#1E2A36] border-[#1E2A36] ${
                            emptyInputError && selectedAdmin?.role == ""
                              ? "border-red-500"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1E2A36] max-md:text-sm">
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                      {emptyInputError ? (
                        <p className="mt-4 text-red-500 text-center max-md:text-sm">
                          Please fill-out required fields
                        </p>
                      ) : passwordMismatchError ? (
                        <p className="mt-4 text-red-500 text-center max-md:text-sm">
                          Passwords do not match
                        </p>
                      ) : adminInputError ? (
                        <p className="mt-4 text-red-500 text-center max-md:text-sm">
                          {adminInputErrorMessage}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <DialogFooter className="flex-row justify-end space-x-2">
                    <form onSubmit={handleSelectedAdminSubmit}>
                      <Button
                        type="submit"
                        className={`bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90 ${
                          isSubmitting ? "pointer-events-none opacity-50" : ""
                        }`}
                        aria-disabled={isSubmitting}
                      >
                        {isSubmitting ? "Updating..." : "Update"}
                      </Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="bg-[#13202D] border-[#1E2A36] max-w-lg w-[95%] max-h-[90vh] overflow-y-auto rounded-xl">
                  <DialogHeader>
                    <DialogTitle className="text-red-700 text-lg max-md:text-md">
                      Delete Admin
                    </DialogTitle>
                    <DialogDescription className="max-md:text-sm">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-red-700">
                        {selectedAdmin!.username}
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
                        "By deleting this admin account, they will no longer have access to the Velocity Market App's Admin Dashboard"
                      }
                    </p>
                  </div>
                  <DialogFooter className="flex-row justify-end space-x-2">
                    <form onSubmit={handleAdminDelete}>
                      <Button
                        type="submit"
                        className={`bg-red-700 text-[#0C1924] hover:bg-red-700/90" ${
                          isSubmitting ? "pointer-events-none opacity-50" : ""
                        }`}
                        aria-disabled={isSubmitting}
                      >
                        {isSubmitting ? "Deleting..." : "Delete"}
                      </Button>
                    </form>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminsPage;
