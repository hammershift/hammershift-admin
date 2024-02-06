"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import CarPhoto from "../../../../public/images/car-photo.svg";
import HourGlass from "../../../../public/images/hourglass.svg";
import Checkbox from "@mui/material/Checkbox";
import { getCarsWithFilter } from "@/app/lib/data";
import { boolean, number } from "zod";

interface CarData {
    _id: string;
    auction_id: string;
    bids: number;
    category: string;
    chassis: string;
    deadline: string;
    description: string[];
    era: string;
    image: string;
    images_list: { placing: number; src: string }[];
    isActive: boolean;
    listing_details: string[];
    listing_type: string;
    location: string;
    lot_num: string;
    make: string;
    model: string;
    page_url: string;
    price: number;
    seller: string;
    state: string;
    status: number;
    website: string;
    year: string;
}

interface SelectedDataType {
    _id: string;
    title: string;
    deadline: string;
    auction_id: string;
}

const selectedDataSample = [
    {
        _id: "XL9AA11G06Z363154",
        title: "2006 Spyker C8 Spyder",
        deadline: "2024-02-17T18:17:00.000Z",
        auction_id: "69824733",
    },
];

const CreateTournamentsPage = () => {
    const [auctionsData, setAuctionsData] = useState<CarData[] | null>([]); // data for list of auctions
    const [displayCount, setDisplayCount] = useState(7);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedData, setSelectedData] = useState<SelectedDataType[] | null>(
        selectedDataSample
    );

    // fetch auctions data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getCarsWithFilter({ limit: displayCount });

                if (data && "cars" in data) {
                    setAuctionsData(data.cars as CarData[]);
                    setIsLoading(false);
                } else {
                    console.error("Unexpected data structure:", data);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [displayCount]);

    // check if data is fetched
    useEffect(() => {
        console.log(auctionsData);
    }, [auctionsData]);

    return (
        <div className="section-container tw-mt-4 tw-flex tw-flex-col tw-gap-4">
            <div className="tw-flex tw-justify-between">
                <div className="tw-text-2xl tw-font-bold">
                    Create Tournament
                </div>
                <button className="btn-yellow">CREATE TOURNAMENT</button>
            </div>
            <div className="tw-flex tw-gap-4">
                <div className="tw-flex tw-flex-col tw-w-2/5 tw-gap-4">
                    <div className="tw-w-full tw-min-h-[200px] tw-bg-white/5 tw-rounded tw-py-8 tw-px-8 tw-flex tw-flex-col tw-gap-4 ">
                        <div className="tw-text-xl tw-font-bold">
                            Tournament Information
                        </div>
                        <div className="tw-flex tw-flex-col tw-gap-1.5">
                            <label>Title</label>
                            <input
                                placeholder="title"
                                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                            />
                        </div>
                        <div className="tw-flex tw-flex-col tw-gap-1.5">
                            <label>Start Date and Time</label>
                            <input
                                type="datetime-local"
                                placeholder="deadline"
                                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                            />
                        </div>
                        <div className="tw-flex tw-flex-col tw-gap-1.5">
                            <label>End Date and Time</label>
                            <input
                                type="datetime-local"
                                placeholder="deadline"
                                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                            />
                        </div>
                        <div className="tw-flex tw-flex-col tw-gap-1.5">
                            <label>Buy-in Price</label>
                            <input
                                placeholder="buy-in price"
                                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                            />
                        </div>
                    </div>
                    <div className="tw-w-full tw-bg-white/5 tw-rounded tw-py-8 tw-px-8 tw-flex tw-flex-col tw-gap-4">
                        <div className="tw-text-xl tw-font-bold">
                            List of Selected Auctions
                        </div>
                        {selectedData &&
                            selectedData?.length > 0 &&
                            selectedData.map((item, index) => (
                                <div key={item._id + "SD"}>
                                    <SelectedCard
                                        _id={item._id}
                                        title={item.title}
                                        deadline={item.deadline}
                                        auction_id={item.auction_id}
                                    />
                                    ,
                                </div>
                            ))}
                    </div>
                </div>
                {/* auctions and filter section */}
                <div className="tw-flex tw-flex-col tw-w-3/5 tw-gap-4 tw-bg-white/5 tw-py-6 tw-px-8">
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
                    <div className=" tw-h-screen tw-rounded-xl tw-bg-white/20 tw-overflow-scroll">
                        {auctionsData &&
                            auctionsData.map((item, index) => {
                                return (
                                    <TournamentsListCard
                                        key={index + "TLC"}
                                        auctionID={item.auction_id}
                                        id={item._id}
                                        image={item.image}
                                        name={`${item.year} ${item.make} ${item.model}`}
                                        description={item.description}
                                        deadline={item.deadline}
                                        selected={
                                            selectedData?.length == 0 ||
                                            selectedData == null
                                                ? false
                                                : selectedData?.some(
                                                      (data) =>
                                                          data._id === item._id
                                                  )
                                        }
                                    />
                                );
                            })}
                    </div>
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
    description: string[];
    deadline: string;
    selected: boolean;
};

const TournamentsListCard: React.FC<tournamentsListCardData> = ({
    auctionID,
    id,
    image,
    name,
    description,
    deadline,
    selected,
}) => {
    function convertDateStringToDateTime(dateString: string) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    const dateTime = convertDateStringToDateTime(deadline);
    return (
        <div>
            <div className="tw-flex tw-gap-6 tw-mt-6 tw-pl-4">
                <div>
                    <Checkbox
                        checked={selected}
                        sx={{
                            "& .MuiSvgIcon-root": { fontSize: 28 },
                            color: "white",
                        }}
                    />
                </div>
                <img
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
                        {description.map((item, index) => (
                            <p key={index}>{item}</p>
                        ))}
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
                            {dateTime}
                        </span>
                    </div>
                </div>
            </div>

            <div className="tw-bg-white/5 tw-h-[1.5px] tw-mt-6"></div>
        </div>
    );
};

const SelectedCard: React.FC<SelectedDataType> = ({
    _id,
    title,
    deadline,
    auction_id,
}) => {
    function convertDateStringToDateTime(dateString: string) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    const dateTime = convertDateStringToDateTime(deadline);
    return (
        <div className="tw-border-solid tw-border-2 tw-border-white tw-border tw-py-3 tw-px-2 tw-rounded">
            <div>
                <div>
                    Auction ID: <span>{auction_id}</span>
                </div>
                <div>
                    Title: <span>{title}</span>
                </div>
                <div>
                    Deadline: <span>{dateTime}</span>
                </div>
                <button className="tw-bg-white/10">Remove?</button>
            </div>
        </div>
    );
};
