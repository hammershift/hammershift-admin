"use client";

import React, { useEffect, useState } from "react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: Function;
  handleResetPassword: () => void;
  resetEmail: string;
  setResetEmail: (email: string) => void;
  modalOnDisplay: string;
  error: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  handleResetPassword,
  resetEmail,
  setResetEmail,
  modalOnDisplay,
  error,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center tw-z-30">
      <div className="tw-w-[600px] tw-flex tw-flex-col">
        <button
          className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
          onClick={() => {
            onClose();
            setResetEmail("");
          }}
        >
          x
        </button>
        {modalOnDisplay === "enter email" && (
          <div className="section-container tw-border-2 tw-mt-2">
            <div className="tw-m-4 tw-flex tw-flex-col tw-justify-between">
              <h2 className="tw-text-lg tw-font-bold tw-text-yellow-400">
                RESET PASSWORD
              </h2>
              <p className="tw-text-sm">
                Enter your email to receive instructions on how to reset your
                password
              </p>
              <form
                className="tw-flex tw-flex-col tw-mt-6 tw-gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetPassword();
                }}
              >
                <label>Email:</label>
                <input
                  placeholder="Enter email here"
                  className="tw-text-black tw-p-2 tw-rounded-sm"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                ></input>
                {error ? (
                  <p className="tw-text-red-500 tw-text-sm">{error}</p>
                ) : null}
                <button className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-rounded-sm tw-p-1 tw-w-1/6 tw-self-end">
                  RESET
                </button>
              </form>
            </div>
          </div>
        )}
        {modalOnDisplay === "enter otp" && (
          <div className="section-container tw-border-2 tw-mt-2">
            <div className="tw-m-4 tw-flex tw-flex-col tw-justify-between">
              <h2 className="tw-text-lg tw-font-bold tw-text-yellow-400">
                PLEASE VERIFY YOUR EMAIL
              </h2>
              <p className="tw-text-sm">
                Please check your email account for the verification code we
                just sent you and enter that code in the box below
              </p>
              <form
                className="tw-flex tw-flex-col tw-mt-6 tw-gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <label>Enter OTP:</label>
                <input
                  placeholder="Enter OTP here"
                  className="tw-text-black tw-p-2 tw-rounded-sm"
                ></input>
                <button className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-rounded-sm tw-p-1 tw-w-1/4 tw-self-end">
                  VERIFY OTP
                </button>
              </form>
            </div>
          </div>
        )}
        {modalOnDisplay === "reset password" && (
          <div className="section-container tw-border-2 tw-mt-2">
            <div className="tw-m-4 tw-flex tw-flex-col tw-justify-between">
              <h2 className="tw-text-lg tw-font-bold tw-text-yellow-400">
                RESET ACCOUNT PASSWORD
              </h2>
              <p className="tw-text-sm">Enter a new password</p>
              <form
                className="tw-flex tw-flex-col tw-mt-6 tw-gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <label>New Password:</label>
                <input
                  placeholder="Enter email here"
                  className="tw-text-black tw-p-2 tw-rounded-sm"
                  type="password"
                ></input>
                <label>Confirm Password:</label>
                <input
                  placeholder="Enter email here"
                  className="tw-text-black tw-p-2 tw-rounded-sm"
                  type="password"
                ></input>
                <button className="tw-bg-yellow-400 tw-text-black tw-font-bold tw-rounded-sm tw-p-1 tw-w-1/4 tw-self-end">
                  RESET PASSWORD
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
