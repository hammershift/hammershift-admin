'use client';

import React, { useState } from 'react';

const ApproveTransactionModal = (props: any) => {
  const { handleCloseModal, transactionId, refreshTransactions } = props;
  const [transactionNote, setTransactionNote] = useState('');

  const handleApprove = async () => {
    try {
      console.log('Sending approval request:', { transactionId });
      const responsePost = await fetch('/api/withdrawRequest/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
      });

      const resultPost = await responsePost.json();
      console.log('Approval response:', resultPost);

      if (resultPost.success) {
        const responsePut = await fetch('/api/withdrawRequest/approve', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactionId, transactionNote }),
        });

        const resultPut = await responsePut.json();
        console.log('Update response:', resultPut);

        if (resultPut.success) {
          console.log('Approval and update logged successfully');
          refreshTransactions();
        } else {
          console.error('Failed to update transaction:', resultPut.message);
        }
      } else {
        console.error('Failed to approve transaction:', resultPost.message);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error approving transaction:', error);
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
            handleApprove();
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
            Approve Withdrawal Transaction
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApproveTransactionModal;
