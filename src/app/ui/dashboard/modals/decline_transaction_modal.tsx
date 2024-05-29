'use client';

import React, { useState } from 'react';

const DeclineTransactionModal = (props: any) => {
  const { handleCloseModal, transactionId, refreshTransactions } = props;
  const [transactionNote, setTransactionNote] = useState('');

  const handleDecline = async () => {
    try {
      console.log('Sending decline request:', { transactionId, transactionNote });
      const response = await fetch('/api/withdrawRequest/decline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId, transactionNote }),
      });

      const result = await response.json();
      console.log('Decline response:', result);

      if (result.success) {
        console.log('Decline logged successfully');
        refreshTransactions(); 
      } else {
        console.error('Failed to log decline:', result.message);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error declining transaction:', error);
    }
  };

  return (
    <div className='tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-25 tw-backdrop-blur-sm tw-flex tw-justify-center tw-items-center tw-z-30'>
      <div className='tw-w-[600px] tw-flex tw-flex-col'>
        <button onClick={handleCloseModal} className='tw-text-white tw-text-xl tw-place-self-end tw-rounded-full tw-border-2 tw-w-8 hover:tw-bg-yellow-400'>
          x
        </button>
        <form
          className='section-container tw-flex tw-flex-col tw-items-center'
          onSubmit={(e) => {
            e.preventDefault();
            handleDecline();
          }}
        >
          <label className='tw-text-xl tw-self-start tw-p-2'>Note:</label>
          <input
            type='text'
            value={transactionNote}
            className='tw-w-full tw-m-2 tw-p-3 tw-text-black'
            placeholder='Type in note...'
            onChange={(e) => setTransactionNote(e.target.value)}
          ></input>
          <button type='submit' className='btn-yellow tw-w-1/2'>
            Reject Withdrawal Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default DeclineTransactionModal;
