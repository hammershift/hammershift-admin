"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { editAdminWithId } from "@/app/lib/data";

const EditAdmin = ({ params }: { params: { id: string } }) => {
  const [adminData, setAdminData] = useState<any>(null);
  const [newAdminData, setNewAdminData] = useState<any>({});
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
    <div className="section-container tw-mt-4">
      <Link href={`/dashboard/admins`}>
        <ArrowBackIcon />
      </Link>
      <h2 className="tw-font-bold tw-m-4 tw-text-yellow-500">
        EDIT ADMIN ACCOUNT
      </h2>{" "}
      {adminData && (
        <form>
          <div className="tw-flex tw-flex-col tw-justify-between tw-gap-4 tw-m-6">
            <div className="tw-flex tw-justify-between tw-w-2/5">
              <label className="tw-px-6">Admin ID:</label>
              <input
                type="text"
                name="_id"
                value={adminData?._id}
                className="tw-bg-[#fff]/20 tw-text-white/50 tw-border-yellow-500 tw-border-2 tw-px-1"
                disabled
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-2/5">
              <label className="tw-px-6">First Name:</label>
              <input
                type="text"
                name="first_name"
                defaultValue={adminData?.first_name || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-2/5">
              <label className="tw-px-6">Last Name:</label>
              <input
                name="last_name"
                type="text"
                defaultValue={adminData?.last_name || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-2/5">
              <label className="tw-px-6">Email:</label>
              <input
                name="email"
                type="text"
                defaultValue={adminData?.email || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-2/5">
              <label className="tw-px-6">Username:</label>
              <input
                name="username"
                type="text"
                defaultValue={adminData?.username || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-2/5">
              <label className="tw-px-6">Password:</label>
              <input
                name="password"
                type="password"
                defaultValue={adminData?.password || ""}
                className="tw-bg-[#fff]/20 tw-border-yellow-500 tw-border-2 tw-px-1"
                onChange={handleChange}
              />
            </div>
            <div className="tw-flex tw-justify-between tw-w-1/4">
              <label className="tw-px-6">Role:</label>
              <div>
                <div>
                  <input
                    type="radio"
                    name="role"
                    value={"owner"}
                    checked={newAdminData.role === "owner"}
                    onChange={handleRoleChange}
                  ></input>
                  <label>Owner</label>
                </div>
                <div>
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={newAdminData.role === "admin"}
                    onChange={handleRoleChange}
                  ></input>
                  <label>Admin</label>
                </div>
                <div>
                  <input
                    type="radio"
                    name="role"
                    value="moderator"
                    checked={newAdminData.role === "moderator"}
                    onChange={handleRoleChange}
                  ></input>
                  <label>Moderator</label>
                </div>
                <div>
                  <input
                    type="radio"
                    name="role"
                    value="guest"
                    checked={newAdminData.role === "guest"}
                    onChange={handleRoleChange}
                  ></input>
                  <label>Guest</label>
                </div>
              </div>
            </div>
            <div className="tw-flex tw-gap-1 tw-justify-evenly tw-w-2/5 tw-m-4">
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
