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
    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex justify-center items-center">
      <div className="w-[600px] flex flex-col">
        <button
          className="text-white text-xl place-self-end rounded-full border-2 w-8 hover:bg-yellow-400"
          onClick={() => onClose()}
        >
          x
        </button>
        <div className="flex flex-col justify-evenly p-5 bg-sky-950">
          <p>
            Are you sure you want to ban{" "}
            <span className="font-semibold text-yellow-400">{username}</span>?
          </p>
          <div className="bg-slate-300 p-2 m-2 text-sm">
            <p className="text-lg font-bold text-red-700">Warning</p>
            <p className="text-red-700">
              By banning this account, this user will no longer have access to
              the Hammershift App
            </p>
          </div>
          <div className="flex justify-evenly">
            <button
              className="bg-yellow-500 text-red-700 font-bold w-1/5 h-8 rounded-md"
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
