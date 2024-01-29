"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { editAdminWithId } from "@/app/lib/data";

const EditAdmin = ({ params }: { params: { id: string } }) => {
  const [adminData, setAdminData] = useState<any>(null);
  const [newAdminData, setNewAdminData] = useState<any>({});
  const [selectedRole, setSelectedRole] = useState("");

  const router = useRouter();
  const ID = params.id;

  useEffect(() => {
    const fetchAdminData = async () => {
      const res = await fetch("/api/admins?_id=" + ID);
      const json = await res.json();
      console.log(json);
      setAdminData(json);
    };
    fetchAdminData();
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setNewAdminData({ ...newAdminData, [name]: value });
    console.log(newAdminData);
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAdminData({ ...newAdminData, role: e?.target.value });
    setSelectedRole(e.target.value);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await editAdminWithId(ID, newAdminData);
    if (res) {
      console.log(res);
      alert("Admin Edit Successful");
      router.push("/dashboard/admins");
    } else {
      console.error;
      console.log(res);
      alert("Unauthorized Admin Edit");
    }
  };

  return (
    <div className="section-container tw-mt-4 tw-flex tw-flex-col max-md:tw-items-start">
      <Link href={`/dashboard/admins`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
        EDIT ADMIN ACCOUNT
      </h2>{" "}
      {adminData && (
        <form className="tw-flex tw-flex-col max-md:tw-items-start">
          <div className="tw-flex tw-flex-col tw-justify-between tw-gap-4 tw-m-6">
            <div className="tw-flex tw-justify-between tw-w-1/2 max-md:tw-w-full">
              <label className="tw-px-6">Admin ID:</label>
              <input
                type="text"
                name="_id"
                value={adminData?._id}
                className="tw-bg-[#fff]/20 tw-text-white/50 tw-border-yellow-500 tw-border-2 tw-px-1"
                disabled
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 max-md:tw-w-full">
              <label className="tw-px-6">First Name:</label>
              <input
                type="text"
                name="first_name"
                defaultValue={adminData?.first_name || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 max-md:tw-w-full">
              <label className="tw-px-6">Last Name:</label>
              <input
                name="last_name"
                type="text"
                defaultValue={adminData?.last_name || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 max-md:tw-w-full">
              <label className="tw-px-6">Email:</label>
              <input
                name="email"
                type="text"
                defaultValue={adminData?.email || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 max-md:tw-w-full">
              <label className="tw-px-6">Username:</label>
              <input
                name="username"
                type="text"
                defaultValue={adminData?.username || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 max-md:tw-w-full">
              <label className="tw-px-6">Password:</label>
              <input
                name="password"
                type="password"
                defaultValue={adminData?.password || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/2 tw-pr-24 max-md:tw-w-full">
              <label className="tw-px-6">Role:</label>
              <div>
                <div
                  className={`tw-flex tw-justify-start tw-border-2 tw-bg-[#fff]/20 tw-rounded-sm tw-w-auto tw-m-1 tw-px-2 hover:tw-cursor-pointer hover:tw-bg-gray-800 ${
                    selectedRole === "owner"
                      ? "tw-bg-gray-800 tw-border-yellow-500"
                      : "tw-bg-[#fff]/20 tw-border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    id="owner"
                    name="role"
                    value={"owner"}
                    checked={newAdminData.role === "owner"}
                    onChange={handleRoleChange}
                  ></input>
                  <label
                    htmlFor="owner"
                    className="tw-px-2 hover:tw-cursor-pointer"
                  >
                    Owner
                  </label>
                </div>
                <div
                  className={`tw-flex tw-justify-start tw-border-2 tw-bg-[#fff]/20 tw-rounded-sm tw-w-auto tw-m-1 tw-px-2 hover:tw-cursor-pointer hover:tw-bg-gray-800 ${
                    selectedRole === "admin"
                      ? "tw-bg-gray-800 tw-border-yellow-500"
                      : "tw-bg-[#fff]/20 tw-border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    id="admin"
                    name="role"
                    value="admin"
                    checked={newAdminData.role === "admin"}
                    onChange={handleRoleChange}
                  ></input>
                  <label
                    htmlFor="admin"
                    className="tw-px-2 hover:tw-cursor-pointer"
                  >
                    Admin
                  </label>
                </div>
                <div
                  className={`tw-flex tw-justify-between tw-border-2 tw-bg-[#fff]/20 tw-rounded-sm tw-w-auto tw-m-1 tw-px-2 hover:tw-cursor-pointer hover:tw-bg-gray-800 ${
                    selectedRole === "moderator"
                      ? "tw-bg-gray-800 tw-border-yellow-500"
                      : "tw-bg-[#fff]/20 tw-border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    id="moderator"
                    name="role"
                    value="moderator"
                    checked={newAdminData.role === "moderator"}
                    onChange={handleRoleChange}
                  ></input>
                  <label
                    htmlFor="moderator"
                    className="tw-px-2 hover:tw-cursor-pointer"
                  >
                    Moderator
                  </label>
                </div>
                <div
                  className={`tw-flex tw-justify-start tw-border-2 tw-bg-[#fff]/20 tw-rounded-sm tw-w-auto tw-m-1 tw-px-2 hover:tw-cursor-pointer hover:tw-bg-gray-800 ${
                    selectedRole === "guest"
                      ? "tw-bg-gray-800 tw-border-yellow-500"
                      : "tw-bg-[#fff]/20 tw-border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    id="guest"
                    name="role"
                    value="guest"
                    checked={newAdminData.role === "guest"}
                    onChange={handleRoleChange}
                  ></input>
                  <label
                    htmlFor="guest"
                    className="tw-px-2 hover:tw-cursor-pointer"
                  >
                    Guest
                  </label>
                </div>
              </div>
            </div>
            <div className="tw-flex tw-gap-1 tw-justify-start tw-w-2/5 tw-m-4 max-md:tw-w-full">
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

export default EditAdmin;
