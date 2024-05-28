'use client'

import React, { useState } from 'react'

const DeclineTransactionModal = (props: any) => {
    const { handleCloseModal } = props;
    const [transactionNote, setTransactionNote] = useState("");
    return (
      <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center tw-z-30">
        <div className="tw-w-[600px] tw-flex tw-flex-col">
          <button
            onClick={handleCloseModal}
            className="tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400"
          >
            x
          </button>
          <form className="section-container tw-flex tw-flex-col tw-items-center">
            <label className="tw-text-xl tw-self-start tw-p-2">Note:</label>
            <input
              type="text"
              value={transactionNote}
              className="tw-w-full tw-m-2 tw-p-3 tw-text-black"
              placeholder="Type in note..."
              onChange={(e) => setTransactionNote(e.target.value)}
            ></input>
            <button className="btn-yellow tw-w-1/2">
              Reject Withdrawal Transaction
            </button>
          </form>
        </div>
      </div>
    );
}

export default DeclineTransactionModal