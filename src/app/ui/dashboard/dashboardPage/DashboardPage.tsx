"use client"
import React from 'react'
import Image from 'next/image'
import { DataGrid, GridRowsProp, GridColDef } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';
import GroupIcon from '@mui/icons-material/Group';
import PaidIcon from '@mui/icons-material/Paid';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { createTheme, useTheme, ThemeProvider } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const data = [
  {
    name: "Sun",
    wagers: 4000,
    auctions: 2400,
  },
  {
    name: "Mon",
    wagers: 3000,
    auctions: 1398,
  },
  {
    name: "Tue",
    wagers: 2000,
    auctions: 3800,
  },
  {
    name: "Wed",
    wagers: 2780,
    auctions: 3908,
  },
  {
    name: "Thu",
    wagers: 1890,
    auctions: 4800,
  },
  {
    name: "Fri",
    wagers: 2390,
    auctions: 3800,
  },
  {
    name: "Sat",
    wagers: 3490,
    auctions: 4300,
  }
];

const list = [{
    id: 'list1',
    wager: 10,
    price: 5000,
    status: 'On Going',
    user: 'Sonic001'
}, {
    id: 'list2',
    wager: 10,
    price: 6000,
    status: 'On Going',
    user: 'Goku001'
}, {
    id: 'list3',
    wager: 10,
    price: 6500,
    status: 'Completed',
    user: 'Naruto001'
}
];

const DashboardPage = () => {

  return (
    <div className='tw-w-full tw-grid tw-gap-4 '>
        <div className='tw-grid tw-grid-cols-3 tw-gap-4 tw-w-full'>
            <div className='section-container tw-flex tw-gap-2'>              
                <GroupIcon/>                
                <div className='tw-grid tw-gap-2'>
                    <div>Total Users</div>
                    <div className='tw-text-lg tw-font-bold'>100</div>
                    <div><span className='tw-text-[#49C742]'>12%</span> more than last week</div>
                </div>
            </div>
            <div className='section-container tw-flex tw-gap-2'>
                <PaidIcon/>
                <div className='tw-grid tw-gap-2'>
                    <div>Wagers</div>
                    <div className='tw-text-lg tw-font-bold'>100</div>
                    <div><span className='tw-text-[#49C742]'>12%</span> more than last week</div>
                </div>
            </div>
            <div className='section-container tw-flex tw-gap-2'>
                <DirectionsCarIcon/>
                <div className='tw-grid tw-gap-2'>
                    <div>Auctions</div>
                    <div className='tw-text-lg tw-font-bold'>100</div>
                    <div><span className='tw-text-[#49C742]'>12%</span> more than last week</div>
                </div>
            </div>
        </div>
        <div className='section-container'>
            <div className='tw-mb-4'>LATEST WAGERS</div>
            <Table/>
        </div>
        <div className='section-container'>
            <div className='tw-mb-4'>WEEKLY RECAP</div>
            <div className='tw-w-full tw-h-[450px]'>
                <Chart/>
            </div>
        </div>
    </div>
  )
}

export default DashboardPage

const Table = () => {
    return (
        <table className='tw-w-full tw-border-separate tw-border-spacing-y-2 tw-text-center'>
            <thead>
                <tr>
                    <th className='tw-p-2.5 tw-font-bold '>Wager</th>
                    <th className='tw-p-2.5 tw-font-bold'>Price</th>
                    <th className='tw-p-2.5 tw-font-bold'>Status</th>
                    <th className='tw-p-2.5 tw-font-bold'>User</th>
                </tr>
            </thead>
            <tbody className='tw-w-full'>
                {
                    list && 
                    list.map((item, index) => (
                         <tr key={item.id} className=' tw-rounded-lg tw-bg-[#fff]/5'>
                            <td className='tw-p-2.5 tw-w-1/4'>${item.wager}.00</td>
                            <td className='tw-p-2.5 tw-w-1/4'>${item.price}</td>
                            <td className='tw-p-2.5 tw-w-1/4'>
                              <span className={`tw-p-2 tw-rounded ${item.status == "On Going" ? 'tw-bg-[#49C742]/20' : 'tw-bg-[#C2451E]/20'}`}>{item.status}
                              </span>
                            </td>
                            <td className='tw-p-2.5 tw-w-1/4'>{item.user}</td>
                        </tr>
                    )
                    )
                    }
            </tbody>
        </table>
    )
}


const Chart = () => {
    return (
      <ResponsiveContainer width="100%" height="95%">
        <LineChart
          width={500}
          height={300}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="wagers" stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="auctions" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    );
}