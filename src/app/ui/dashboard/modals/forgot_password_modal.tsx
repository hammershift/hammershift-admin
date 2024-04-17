"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getOneAuction } from "@/app/lib/data";
import { FadeLoader } from "react-spinners";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: Function;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }
  return (
    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center tw-z-30">
      <div className="tw-w-[600px] tw-flex tw-flex-col">
        <button
          className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
          onClick={() => onClose()}
        >
          x
        </button>
        <ShowModal />
      </div>
    </div>
  );
};

export default ForgotPasswordModal;

const ShowModal = () => {
  return (
    <div className="section-container tw-border-2 tw-mt-2">
      <div className="tw-m-4 tw-flex tw-flex-col tw-justify-between">
        <h2 className="tw-text-lg tw-font-bold tw-text-yellow-400">
          RESET PASSWORD
        </h2>
        <p className="tw-text-sm">
          Enter your email to receive instructions on how to reset your password
        </p>
        <form className="tw-flex tw-flex-col tw-mt-6 tw-gap-2">
          <label>Email:</label>
          <input
            placeholder="Enter email here"
            className="tw-text-black tw-p-2 tw-rounded-sm"
            type="email"
          ></input>
          <button className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-rounded-sm tw-p-1 tw-w-1/6 tw-self-end">
            RESET
          </button>
        </form>
      </div>
    </div>
  );
};
