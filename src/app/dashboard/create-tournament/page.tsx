"use client";
import React, { useState } from "react";
import Image from "next/image";
import CarPhoto from "../../../../public/images/car-photo.svg";
import HourGlass from "../../../../public/images/hourglass.svg";
import Checkbox from "@mui/material/Checkbox";

const sampleData = [
    {
        id: "1TLC",
        auctionID: "27326382",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.9",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    },
    {
        id: "2TLC",
        auctionID: "27326382",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.91",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    },
    {
        id: "3TLC",
        auctionID: "27326382",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.92",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    },
    {
        id: "4TLC",
        auctionID: "27326382",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.93",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    },
    {
        id: "5TLC",
        auctionID: "27326382",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.94",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    },
    {
        id: "6TLC",
        auctionID: "27326382",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.95",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    },
];

const CreateTournamentsPage = () => {
    const [auctionsData, setAuctionsData] = useState([]); // data for list of auctions
    return (
        <div className="section-container tw-mt-4 tw-flex tw-flex-col tw-gap-5">
            <div className="tw-flex tw-justify-between">
                <div className="tw-text-xl tw-font-bold">Create Tournament</div>
                <button>CREATE TOURNAMENT</button>
            </div>
            <div className="tw-flex tw-w-full tw-gap-4">
                <div className="tw-w-1/2 tw-min-h-[200px] tw-bg-white/5 tw-rounded tw-py-6 tw-flex tw-flex-col tw-gap-4 tw-px-4">
                    <div className="tw-text-lg tw-font-bold">
                        Tournament Information
                    </div>
                    <div className="tw-flex tw-flex-col tw-gap-1.5">
                        <label>Category</label>
                        <input
                            placeholder="category"
                            className="tw-px-2 tw-flex-grow tw-rounded"
                        />
                    </div>
                    <div className="tw-flex tw-flex-col tw-gap-1.5">
                        <label>Deadline</label>
                        <input
                            placeholder="deadline"
                            className="tw-px-2 tw-flex-grow tw-rounded"
                        />
                    </div>
                    <div className="tw-flex tw-flex-col tw-gap-1.5">
                        <label>Buy-in Price</label>
                        <input
                            placeholder="buy-in price"
                            className="tw-px-2 tw-flex-grow tw-rounded"
                        />
                    </div>
                </div>
                <div className="tw-w-1/2 tw-bg-white/5 tw-rounded tw-py-4 tw-px-4 tw-text-lg  tw-font-bold ">
                    List of Selected Auctions
                </div>
            </div>
            <div className="tw-flex tw-flex-col tw-w-full tw-gap-4">
                <div className="tw-text-lg  tw-font-bold">Auctions</div>
                <div className="tw-flex tw-gap-4">
                    <div>Filters:</div>
                    <div>Dropdown Filter 1</div>
                    <div>Dropdown Filter 2</div>
                    <div>Dropdown Filter 3</div>
                    <div>Dropdown Filter 4</div>
                    <div>Sort:</div>
                    <div>Dropdown Sort 1</div>
                </div>
                <div>
                    {sampleData &&
                        sampleData.map((item, index) => {
                            return (
                                <TournamentsListCard
                                    key={index + "TLC"}
                                    auctionID={item.auctionID}
                                    id={item.id}
                                    image={item.image}
                                    name={item.name}
                                    description={item.description}
                                    deadline={item.deadline}
                                />
                            );
                        })}
                </div>
            </div>
        </div>
    );
};

export default CreateTournamentsPage;

type tournamentsListCardData = {
    auctionID: string;
    id: string;
    image: string;
    name: string;
    description: string;
    deadline: string;
};

export const TournamentsListCard: React.FC<tournamentsListCardData> = ({
    auctionID,
    id,
    image,
    name,
    description,
    deadline,
}) => {
    const tournamentsListCardData = {
        id: "1TLC",
        image: CarPhoto,
        name: "1974 Maserati Bora 4.9",
        description:
            "Nisi anim cupidatat elit proident ipsum reprehenderit adipisicing ullamco do pariatur quis sunt exercitation officia. Tempor magna duis mollit culpa. Laborum esse eu occaecat dolor laborum exercitation. Sunt labore et sunt consequat culpa velit non do culpa ex tempor irure. Deserunt est exercitation consectetur nisi id.",
        deadline: "05:16:00",
    };

    return (
        <div>
            <div className="tw-flex tw-gap-8 tw-mt-6">
                <div>
                    <Checkbox
                        sx={{
                            "& .MuiSvgIcon-root": { fontSize: 28 },
                            color: "white",
                        }}
                    />
                </div>
                <Image
                    src={image}
                    width={416}
                    height={240}
                    alt="car"
                    className="tw-w-[200px] tw-h-auto tw-object-cover tw-aspect-auto"
                />
                <div>
                    <div className="tw-opacity-30 tw-text-lg tw-font-bold">
                        Auction ID: {auctionID}
                    </div>
                    <div className="tw-text-2xl tw-font-bold tw-mt-3">
                        {name}
                    </div>
                    <div className="tw-h-[72px] tw-ellipsis tw-overflow-hidden">
                        {description}
                    </div>
                    <div className="tw-flex tw-mt-4">
                        <Image
                            src={HourGlass}
                            width={20}
                            height={20}
                            alt="car"
                            className="tw-w-5 tw-h-5"
                        />
                        <span className="tw-text-[#F2CA16] tw-font-bold tw-ml-2">
                            {deadline}
                        </span>
                    </div>
                </div>
            </div>

            <div className="tw-bg-white/5 tw-h-[1.5px] tw-mt-6"></div>
        </div>
    );
};
