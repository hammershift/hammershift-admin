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
  handleOtpVerification: () => void;
  otp: string;
  setOtp: (otp: string) => void;
  handlePasswordReset: (e: React.FormEvent) => void;
  newPassword: string;
  setNewPassword: (newPassword: string) => void;
  confirmPassword: string;
  setConfirmPassword: (confirmPassword: string) => void;
  otpExpired: boolean;
  formatTime: () => string;
  handleResendOtp: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  handleResetPassword,
  resetEmail,
  setResetEmail,
  modalOnDisplay,
  error,
  handleOtpVerification,
  otp,
  setOtp,
  handlePasswordReset,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  otpExpired,
  formatTime,
  handleResendOtp,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-30">
      <div className="w-[600px] flex flex-col">
        <button
          className="text-white text-xl place-self-end rounded-full border-2 w-8 hover:bg-yellow-400"
          onClick={() => {
            onClose();
            setResetEmail("");
          }}
        >
          x
        </button>
        {modalOnDisplay === "enter email" && (
          <div className="section-container border-2 mt-2">
            <div className="m-4 flex flex-col justify-between">
              <h2 className="text-lg font-bold text-yellow-400">
                RESET PASSWORD
              </h2>
              <p className="text-sm">
                Enter your email to receive instructions on how to reset your
                password
              </p>
              <form
                className="flex flex-col mt-6 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleResetPassword();
                }}
              >
                <label>Email:</label>
                <input
                  placeholder="Enter email here"
                  className="text-black p-2 rounded-sm"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                ></input>
                {error ? <p className="text-red-500 text-sm">{error}</p> : null}
                <button className="bg-yellow-400 text-black font-bold rounded-sm p-1 w-1/6 self-end">
                  RESET
                </button>
              </form>
            </div>
          </div>
        )}
        {modalOnDisplay === "enter otp" && (
          <div className="section-container border-2 mt-2">
            <div className="m-4 flex flex-col justify-between">
              <h2 className="text-lg font-bold text-yellow-400">
                PLEASE VERIFY YOUR EMAIL
              </h2>
              <p className="text-sm">
                Please check your email account for the verification code we
                just sent you and enter that code in the box below
              </p>
              <form
                className="flex flex-col mt-6 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOtpVerification();
                }}
              >
                <label>Enter OTP:</label>
                <input
                  placeholder="Enter OTP here"
                  className="text-black p-2 rounded-sm"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                ></input>
                {error ? <p className="text-red-500 text-sm">{error}</p> : null}
                {!otpExpired ? (
                  <div className="text-sm mb-2 ml-2">
                    Time Remaining: {formatTime()}
                  </div>
                ) : (
                  <p
                    className="underline hover:cursor-pointer"
                    onClick={handleResendOtp}
                  >
                    Resend Code
                  </p>
                )}
                <button className="bg-yellow-400 text-black font-bold rounded-sm p-1 w-1/4 self-end">
                  VERIFY OTP
                </button>
              </form>
            </div>
          </div>
        )}
        {modalOnDisplay === "reset password" && (
          <div className="section-container border-2 mt-2">
            <div className="m-4 flex flex-col justify-between">
              <h2 className="text-lg font-bold text-yellow-400">
                RESET ACCOUNT PASSWORD
              </h2>
              <p className="text-sm">Enter a new password</p>
              <form
                className="flex flex-col mt-6 gap-2"
                onSubmit={handlePasswordReset}
              >
                <label>New Password:</label>
                <input
                  placeholder="Enter email here"
                  className="text-black p-2 rounded-sm"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                ></input>
                <label>Confirm Password:</label>
                <input
                  placeholder="Enter email here"
                  className="text-black p-2 rounded-sm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                ></input>
                <button className="bg-yellow-400 text-black font-bold rounded-sm p-1 w-1/4 self-end">
                  RESET PASSWORD
                </button>
              </form>
            </div>
          </div>
        )}
        {modalOnDisplay === "success" && (
          <div className="section-container border-2 mt-2">
            <div className="m-4 flex flex-col justify-between">
              <h2 className="text-lg font-bold text-yellow-400">
                PASSWORD UPDATED!
              </h2>
              <p>Your password has been changed successfully</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
