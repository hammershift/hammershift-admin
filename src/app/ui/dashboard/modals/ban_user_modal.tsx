import React from "react";

interface BanUserModalProps {
  isOpen: boolean;
  onClose: Function;
  username: string;
  onConfirm: (_id: string) => void;
  id: string;
}

const BanUserModal: React.FC<BanUserModalProps> = ({
  isOpen,
  onClose,
  username,
  onConfirm,
  id,
}) => {
  if (!isOpen) {
    return null;
  }
  return (
    <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center">
      <div className="tw-w-[600px] tw-flex tw-flex-col">
        <button
          className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
          onClick={() => onClose()}
        >
          x
        </button>
        <div className="tw-flex tw-flex-col tw-justify-evenly tw-p-5 tw-bg-sky-950">
          <p>
            Are you sure you want to ban{" "}
            <span className="tw-font-semibold tw-text-yellow-400">
              {username}
            </span>
            ?
          </p>
          <div className="tw-bg-slate-300 tw-p-2 tw-m-2 tw-text-sm">
            <p className="tw-text-lg tw-font-bold tw-text-red-700">Warning</p>
            <p className="tw-text-red-700">
              By banning this account, this user will no longer have access to
              the Hammershift App
            </p>
          </div>
          <div className="tw-flex tw-justify-evenly">
            <button
              className="tw-bg-yellow-500 tw-text-black tw-font-bold tw-w-1/5 tw-rounded-md"
              onClick={() => username && onConfirm(id)}
            >
              Confirm
            </button>
            <button onClick={() => onClose()}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BanUserModal;
