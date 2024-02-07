"use client";
import React, { RefObject, useEffect, useRef, useState } from "react";
import Image from "next/image";
import CarPhoto from "../../../../public/images/car-photo.svg";
import HourGlass from "../../../../public/images/hourglass.svg";
import Checkbox from "@mui/material/Checkbox";
import { getCarsWithFilter } from "@/app/lib/data";
import { boolean, number } from "zod";
import { Button } from "@mui/material";

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
    image: string;
}

type HandleCheckboxType = (
    _id: string,
    title: string,
    deadline: string,
    auction_id: string,
    image: string
) => void;

const MakeDropdownContent = [
    "All",
    "Acura",
    "Audi",
    "BMW",
    "Alfa Romeo",
    "Aston Martin",
    "Honda",
    "Jaguar",
    "Jeep",
    "Kia",
    "Lamborghini",
    "Land Rover",
    "Lexus",
    "Chrysler",
    "Chevrolet",
    "Cadillac",
    "Buick",
    "Bugatti",
    "Bentley",
    "Hyundai",
    "Lincoln",
    "Lotus",
    "Lucid",
    "Maserati",
    "Mazda",
    "McLaren",
    "Genesis",
    "GMX",
    "Ford",
    "Fiat",
    "Ferrari",
    "Dodge",
    "Infiniti",
    "Mercedes-Benz",
    "Mini",
    "Mitsubishi",
    "Nissan",
    "Polestar",
    "Porsche",
];

const CategoryDropdownContent = [
    "All",
    "Coupes",
    "Crossovers",
    "EVs and Hybrids",
    "Hatchbacks",
    "Luxury Cars",
    "Minivans & Vans",
    "Pickup Trucks",
    "SUVs",
    "Sedans",
    "Small Cars",
    "Sports Cars",
    "Station Wagons",
];

const EraDropdownContent = [
    "All",
    "2020s",
    "2010s",
    "2000s",
    "1990s",
    "1980s",
    "1970s",
    "1960s",
    "1950s",
    "1940s",
    "1930s",
    "1920s",
    "1910s",
    "1900 and older",
];

const LocationDropdownContent = [
    "Alabama",
    "Alaska",
    "American Samoa",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "District of Columbia",
    "Federated States of Micronesia",
    "Florida",
    "Georgia",
    "Guam",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Marshall Islands",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Northern Mariana Islands",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Palau",
    "Pennsylvania",
    "Puerto Rico",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virgin Islands",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
];

const SortDropdownContent = [
    "Top Performers",
    "Newly Listed",
    "Most Expensive",
    "Least Expensive",
    "Most Bids",
    "Least Bids",
    "Ending Soon",
];

const FilterInitialState = {
    make: ["All"],
    category: ["All"],
    era: ["All"],
    location: ["All"],
    sort: "Newly Listed",
};

type FiltersType = {
    make: string[];
    category: string[];
    era: string[];
    location: string[];
    sort: string;
};

const CreateTournamentsPage = () => {
    const [auctionsData, setAuctionsData] = useState<CarData[] | null>([]); // data for list of auctions
    const [displayCount, setDisplayCount] = useState(7);
    const [isLoading, setIsLoading] = useState(true);
    const [makeDropdown, setMakeDropdown] = useState(false);
    const [categoryDropdown, setCategoryDropdown] = useState(false);
    const [eraDropdown, setEraDropdown] = useState(false);
    const [locationDropdown, setLocationDropdown] = useState(false);
    const [sortDropdown, setSortDropdown] = useState(false);
    const [selectedData, setSelectedData] = useState<SelectedDataType[] | null>(
        null
    );
    const [filters, setFilters] = useState(FilterInitialState);
    const filterRef = useRef();

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
        console.log("auctionData:", auctionsData);
        console.log("selectedData:", selectedData);
    }, [auctionsData, selectedData]);

    // removes all auctions from selectedData
    const handleRemoveAuctions = () => {
        setSelectedData(null);
    };

    // remove button on selected auctions card
    const handleRemoveSelectedAuction = (id: string) => {
        if (selectedData) {
            const newSelectedData = selectedData.filter(
                (item) => item._id !== id
            );
            setSelectedData(newSelectedData);
        }
    };

    // convert date string to date time
    function convertDateStringToDateTime(dateString: string) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    // adds auction to selectedData
    const handleCheckbox = (
        _id: string,
        title: string,
        deadline: string,
        auction_id: string,
        image: string
    ) => {
        if (selectedData !== null && selectedData.length >= 5) {
            return;
        }
        setSelectedData((prevSelectedData) => {
            // if no data, add new data
            if (!prevSelectedData) {
                return [
                    {
                        _id,
                        title,
                        deadline,
                        auction_id,
                        image,
                    },
                ];
            }
            // remove if already selected
            if (prevSelectedData.some((item) => item._id === _id)) {
                return prevSelectedData.filter((item) => item._id !== _id);
            }
            // add new data
            return [
                ...prevSelectedData,
                {
                    _id: _id,
                    title: title,
                    deadline: deadline,
                    auction_id: auction_id,
                    image: image,
                },
            ];
        });
        return;
    };

    // handle clicking outside of dropdown
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                filterRef.current &&
                !filterRef.current.contains(e.target as Node)
            ) {
                setMakeDropdown(false);
                setCategoryDropdown(false);
                setEraDropdown(false);
                setLocationDropdown(false);
                setSortDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
        };
    }, []);

    // handle checkbox filters, adds to filters state
    const handleCheckboxFilters = (key: string, value: string) => {
        if (key === "sort") {
            // TODO: handle sort differently
        }
        setFilters((prev: any) => {
            // check for prev and if key exists
            if (prev == undefined || !prev[key] === undefined) {
                console.log("!prev");
                return { ...prev };
            }
            // if value is 'All', remove all other items and add 'All' to the array
            if (value === "All") {
                console.log("All");
                return { ...prev, [key]: ["All"] };
            }
            // if 'All' is included in the array, remove it and add the value
            if (prev[key]?.includes("All")) {
                console.log("All is included in prev", key, value);
                return {
                    ...prev,
                    [key]: prev[key]
                        .filter((item: any) => item !== "All")
                        .concat(value),
                };
            }
            // if value is not included in the array, add it
            if (!prev[key]?.includes(value)) {
                console.log("value is not included in prev", key, value);
                return {
                    ...prev,
                    [key]: prev[key].concat(value),
                };
            }
            // if value is included in the array, remove it
            if (prev[key]?.includes(value)) {
                console.log("value is included in prev", key, value);
                const newFilter = {
                    ...prev,
                    [key]: prev[key].filter((item: any) => item !== value),
                };
                // if array is empty, add 'All' to the array
                if (newFilter[key]?.length === 0) {
                    newFilter[key] = ["All"];
                }
                return newFilter;
            }
        });
    };

    // check for filters
    useEffect(() => {
        console.log("filters:", filters);
    }, [filters]);

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
                        <button
                            className="btn-transparent-red"
                            onClick={handleRemoveAuctions}
                        >
                            Remove All Auctions
                        </button>
                        {/* Selected Auctions Card */}
                        {selectedData !== null && selectedData.length > 0 ? (
                            selectedData?.length > 0 &&
                            selectedData.map((item, index) => (
                                <div key={item._id + "SD"}>
                                    <SelectedCard
                                        _id={item._id}
                                        title={item.title}
                                        deadline={item.deadline}
                                        auction_id={item.auction_id}
                                        image={item.image}
                                        handleRemoveSelectedAuction={
                                            handleRemoveSelectedAuction
                                        }
                                        convertDateStringToDateTime={
                                            convertDateStringToDateTime
                                        }
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="tw-h-[50px] tw-flex tw-items-center tw-justify-center">
                                No Auctions Selected
                            </div>
                        )}
                    </div>
                </div>
                {/* auctions and filter section */}
                <div className="tw-flex tw-flex-col tw-w-3/5 tw-gap-4 tw-bg-white/5 tw-py-6 tw-px-8">
                    <div className="tw-text-lg  tw-font-bold">Auctions</div>
                    <div
                        className="tw-flex tw-gap-4"
                        ref={
                            filterRef as unknown as
                                | RefObject<HTMLDivElement>
                                | undefined
                        }
                    >
                        <div>Filters:</div>
                        <div>
                            <div
                                onClick={() => setMakeDropdown((prev) => !prev)}
                                className="tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                            >
                                Make
                            </div>
                            {makeDropdown && (
                                <DropdownComponent
                                    filterKey="make"
                                    content={MakeDropdownContent}
                                    columns={3}
                                    handleCheckboxFilters={
                                        handleCheckboxFilters
                                    }
                                    filters={filters}
                                />
                            )}
                        </div>
                        <div>
                            <div
                                onClick={() =>
                                    setCategoryDropdown((prev) => !prev)
                                }
                                className="tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                            >
                                Category
                            </div>
                            {categoryDropdown && (
                                <DropdownComponent
                                    filterKey="category"
                                    content={CategoryDropdownContent}
                                    columns={3}
                                    handleCheckboxFilters={
                                        handleCheckboxFilters
                                    }
                                    filters={filters}
                                />
                            )}
                        </div>
                        <div>
                            <div
                                onClick={() => setEraDropdown((prev) => !prev)}
                                className="tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                            >
                                Era
                            </div>
                            {eraDropdown && (
                                <DropdownComponent
                                    filterKey="era"
                                    content={EraDropdownContent}
                                    columns={2}
                                    handleCheckboxFilters={
                                        handleCheckboxFilters
                                    }
                                    filters={filters}
                                />
                            )}
                        </div>
                        <div>
                            <div
                                onClick={() =>
                                    setLocationDropdown((prev) => !prev)
                                }
                                className="tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                            >
                                Location
                            </div>
                            {locationDropdown && (
                                <DropdownComponent
                                    filterKey="location"
                                    content={LocationDropdownContent}
                                    columns={3}
                                    handleCheckboxFilters={
                                        handleCheckboxFilters
                                    }
                                    filters={filters}
                                />
                            )}
                        </div>
                        <div>Sort:</div>
                        <div>
                            <div
                                onClick={() => setSortDropdown((prev) => !prev)}
                                className="tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                            >
                                Sort
                            </div>
                            {sortDropdown && (
                                <DropdownComponent
                                    filterKey="sort"
                                    content={SortDropdownContent}
                                    columns={1}
                                    handleCheckboxFilters={
                                        handleCheckboxFilters
                                    }
                                    filters={filters}
                                />
                            )}
                        </div>
                        <button className="btn-white">FILTER</button>
                    </div>
                    <div className=" tw-h-screen tw-rounded-xl tw-bg-white/20 tw-overflow-scroll">
                        {auctionsData &&
                            auctionsData.map((item, index) => {
                                return (
                                    <TournamentsListCard
                                        key={index + "TLC"}
                                        auctionID={item.auction_id}
                                        _id={item._id}
                                        image={item.image}
                                        title={`${item.year} ${item.make} ${item.model}`}
                                        description={item.description}
                                        deadline={item.deadline}
                                        convertDateStringToDateTime={
                                            convertDateStringToDateTime
                                        }
                                        handleCheckbox={handleCheckbox}
                                        selected={
                                            selectedData
                                                ? selectedData.some(
                                                      (data) =>
                                                          data._id === item._id
                                                  )
                                                : false
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
    _id: string;
    image: string;
    title: string;
    description: string[];
    deadline: string;
    convertDateStringToDateTime: (dateString: string) => string;
    handleCheckbox: HandleCheckboxType;
    selected: boolean;
};

const TournamentsListCard: React.FC<tournamentsListCardData> = ({
    auctionID,
    _id,
    image,
    title,
    description,
    deadline,
    convertDateStringToDateTime,
    handleCheckbox,
    selected,
}) => {
    const dateTime = convertDateStringToDateTime(deadline);

    return (
        <div>
            <div className="tw-flex tw-gap-6 tw-mt-6 tw-pl-4">
                <div>
                    <Checkbox
                        checked={selected}
                        value={auctionID}
                        sx={{
                            "& .MuiSvgIcon-root": { fontSize: 28 },
                            color: "white",
                        }}
                        onClick={(e) =>
                            handleCheckbox(
                                _id,
                                title,
                                dateTime,
                                auctionID,
                                image
                            )
                        }
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
                        {title}
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

type SelectedCardProps = SelectedDataType & {
    handleRemoveSelectedAuction: (id: string) => void;
    convertDateStringToDateTime: (dateString: string) => string;
};

// card for selected auctions
const SelectedCard: React.FC<SelectedCardProps> = ({
    _id,
    title,
    deadline,
    auction_id,
    image,
    handleRemoveSelectedAuction,
    convertDateStringToDateTime,
}) => {
    const dateTime = convertDateStringToDateTime(deadline);

    return (
        <div className="tw-flex tw-gap-4 tw-border-solid tw-border-2 tw-border-white tw-border tw-py-3 tw-px-2 tw-rounded">
            <img
                src={image}
                alt={title}
                width={100}
                height={100}
                className="tw-w-[100px] tw-h-[100px] tw-object-cover"
            />
            <div className="tw-grid tw-gap-2">
                <div>
                    Auction ID: <span>{auction_id}</span>
                </div>
                <div>
                    Title: <span>{title}</span>
                </div>
                <div>
                    Deadline: <span>{dateTime}</span>
                </div>
                <button
                    className="btn-transparent-red"
                    onClick={() => handleRemoveSelectedAuction(_id)}
                >
                    Remove?
                </button>
            </div>
        </div>
    );
};

type DropdownComponentProps = {
    filterKey: string;
    content: string[];
    columns: number;
    handleCheckboxFilters: any;
    filters: any;
};
// dropdown component
const DropdownComponent: React.FC<DropdownComponentProps> = ({
    filterKey,
    content,
    columns,
    handleCheckboxFilters,
    filters,
}) => {
    return (
        <div className="tw-absolute tw-bg-[#DCE0D9] tw-text-black tw-py-3 tw-px-4 tw-rounded-lg tw-shadow-lg">
            <ul className={`tw-grid tw-grid-cols-${columns} tw-gap-3 `}>
                {content.map((item: string, index: number) => (
                    <li key={String(index + item)}>
                        <Checkbox
                            checked={
                                filters
                                    ? filters[filterKey]?.includes(item)
                                    : false
                            }
                            onClick={() =>
                                handleCheckboxFilters(filterKey, item)
                            }
                        />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
