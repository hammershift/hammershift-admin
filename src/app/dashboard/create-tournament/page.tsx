"use client";

import Image from "next/image";
import React, { RefObject, useEffect, useRef, useState } from "react";
import { createTournament, getCarsWithFilter } from "@/app/lib/data";
import { BounceLoader } from "react-spinners";
import FunnelFilter from "../../../../public/images/filter-funnel-02.svg";
import ArrowDown from "../../../../public/images/arrows-down.svg";
import {
  DropdownComponent,
  LoadingComponent,
  SelectedCard,
  TournamentsListCard,
} from "@/app/ui/dashboard/createTournament/CreateTournament";
import TournamentModal from "@/app/ui/dashboard/modals/TournamentModal";
import AuctionModal from "@/app/ui/dashboard/modals/auction_modal";
import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { TournamentObjectType } from "@/app/types/tournamentTypes";
import { set } from "mongoose";

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

// dropdown content arrays
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
  "All",
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

const ListOfFilters = ["make", "category", "era", "location"];

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
  const router = useRouter();
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLElement | null>(null);
  const [auctionsData, setAuctionsData] = useState<CarData[] | null>([]); // data for list of auctions
  const [displayCount, setDisplayCount] = useState(7);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  // const [tounamentObjIsValid, setTounamentObjIsValid] = useState(false); // checks completeness of tournamentObject
  const [successfullyPosted, setSuccessfullyPosted] = useState(false); // if tournament is successfully posted
  const [unsuccessfulPosting, setUnsuccessfulPosting] = useState(false);
  const [tournamentObject, setTournamentObject] =
    useState<TournamentObjectType>({});
  const [totalAuctions, setTotalAuctions] = useState<number | null>(null);
  const [loadMoreButton, setLoadMoreButton] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadmoreLoading, setLoadmoreLoading] = useState(true);
  const [createTournamentLoading, setCreateTournamentLoading] = useState(false);
  const [makeDropdown, setMakeDropdown] = useState(false);
  const [categoryDropdown, setCategoryDropdown] = useState(false);
  const [eraDropdown, setEraDropdown] = useState(false);
  const [locationDropdown, setLocationDropdown] = useState(false);
  const [sortDropdown, setSortDropdown] = useState(false);
  const [selectedData, setSelectedData] = useState<SelectedDataType[] | null>(
    null
  );
  const [selectedAuctionId, setSelectedAuctionId] = useState("");
  const [filters, setFilters] = useState(FilterInitialState);
  const [emptyAuctions, setEmptyAuctions] = useState(false);

  const [dateLimit, setDateLimit] = useState(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 14);
    return { start, end };
  });
  const [tournamentEndTime, setTournamentEndTime] = useState<Date | null>(null);
  const [inputError, setInputError] = useState<
    | "buyInPrice"
    | "title"
    | "incomplete"
    | "startTime"
    | "endTime"
    | "auctionID"
    | null
  >(null);
  const [createTournamentCount, setCreateTournamentCount] = useState(0);

  const inputErrorMessages = {
    buyInPrice: "Please enter a valid buy-in price",
    title: "Please enter a title for the tournament",
    incomplete: "Please fill in all fields",
    startTime: "Please enter a valid start time",
    endTime: "Please enter a valid end time",
    auctionID: "Please select 5 auctions",
  };

  // adds 7 to displayCount
  const handleLoadMore = () => {
    if (totalAuctions == null) return;
    setLoadmoreLoading(true);
    if (totalAuctions - displayCount < 7) {
      setDisplayCount(totalAuctions);
    } else {
      setDisplayCount((prev) => prev + 7);
    }
  };

  // check if loadMoreButton should be displayed
  useEffect(() => {
    if (totalAuctions != null && displayCount >= totalAuctions) {
      setLoadMoreButton(false);
    } else {
      setLoadMoreButton(true);
    }
  }, [totalAuctions, displayCount]);

  // fetch auctions data when filters change
  useEffect(() => {
    if (totalAuctions != null) {
      if (displayCount >= totalAuctions) {
        setDisplayCount(totalAuctions);
      } else {
        setDisplayCount(7);
      }
    }
  }, [totalAuctions]);

  // fetch data when displayCount changes
  useEffect(() => {
    fetchData();
  }, [displayCount, filters]);

  // check if data is fetched
  // useEffect(() => {
  //     console.log("auctionData:", auctionsData);
  //     console.log("selectedData:", selectedData);
  //     console.log("tournamentOBJ:", tournamentObject);
  //     console.log("filters:", filters);
  //     console.log("display count:", displayCount);
  // }, [auctionsData, selectedData, tournamentObject, filters]);

  // change selected auction Id
  const selectAuctionID = (id: string) => {
    setSelectedAuctionId(id);
  };

  // dropdown data
  const FiltersDataContent: {
    [key: string]: {
      filterKey: string;
      dropdown: any;
      content: string[];
      columns: number;
      columnsSM: number;
    };
  } = {
    make: {
      filterKey: "make",
      dropdown: makeDropdown,
      content: MakeDropdownContent,
      columns: 3,
      columnsSM: 1,
    },
    category: {
      filterKey: "category",
      dropdown: categoryDropdown,
      content: CategoryDropdownContent,
      columns: 2,
      columnsSM: 1,
    },
    era: {
      filterKey: "era",
      dropdown: eraDropdown,
      content: EraDropdownContent,
      columns: 2,
      columnsSM: 1,
    },
    location: {
      filterKey: "location",
      dropdown: locationDropdown,
      content: LocationDropdownContent,
      columns: 3,
      columnsSM: 1,
    },
  };

  //function to fetch data
  const fetchData = async () => {
    try {
      const data = await getCarsWithFilter({
        limit: displayCount,
        ...filters,
      });

      if (data && "cars" in data) {
        setAuctionsData(data.cars as CarData[]);
        setTotalAuctions(data.total);
        if (data.cars.length === 0) {
          setEmptyAuctions(true);
        } else {
          setEmptyAuctions(false);
        }
        setLoadmoreLoading(false);
      } else {
        console.error("Unexpected data structure:", data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  };

  //creates tournament
  const handleCreateTournament = async () => {
    setCreateTournamentLoading(true);
    const res = await createTournament(tournamentObject);
    if (res.isSuccessful == true) {
      console.log("Tournament created successfully");
      setSuccessfullyPosted(true);
      handleSuccessfulPost();
    } else {
      setUnsuccessfulPosting(true);
    }
    setCreateTournamentLoading(false);
    return { message: "Tournament created successfully" };
  };

  //timer for when tournament is created
  const handleSuccessfulPost = () => {
    setTimeout(() => {
      setSuccessfullyPosted(false);
      setTournamentObject({});
      setSelectedData([]);
      setIsTournamentModalOpen(false);
      router.push("/dashboard/create-tournament");
    }, 5000);
  };

  // onChange of input, saves data to tournamentObject
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value: string | Date | number = e.target.value;
    //turn to number type if buyInFee
    if (e.target.name == "buyInFee") {
      value = Number(value);
    }
    if (e.target.name == "startTime" || e.target.name == "endTime") {
      value = new Date(value).toISOString();
    }
    setTournamentObject((prev) => ({
      ...prev,
      [e.target.name]: value,
    }));
  };

  //check input fields / validation
  const checkInputs = () => {
    if (Object.keys(tournamentObject).length === 0) {
      setInputError("incomplete");
    } else if (
      tournamentObject.title == undefined ||
      tournamentObject.title == ""
    ) {
      setInputError("title");
    } else if (
      tournamentObject.startTime == undefined ||
      tournamentObject.startTime > dateLimit.end.toISOString()
    ) {
      setInputError("startTime");
    } else if (
      tournamentObject.endTime == undefined ||
      tournamentObject.endTime > dateLimit.end.toISOString()
    ) {
      setInputError("endTime");
    } else if (
      tournamentObject.buyInFee == undefined ||
      isNaN(tournamentObject.buyInFee)
    ) {
      setInputError("buyInPrice");
    } else if (
      tournamentObject.auctionID == undefined ||
      selectedData == null ||
      selectedData?.length < 5
    ) {
      setInputError("auctionID");
    } else {
      setInputError(null);
    }
  };

  // checks if tournamentObject is empty
  const handleCheckTournamentObj = () => {
    checkInputs();
    setCreateTournamentCount((prev) => prev + 1);
  };

  // opens modal if there is no input error and tournamentObject is not empty
  useEffect(() => {
    if (inputError == null && Object.keys(tournamentObject).length != 0) {
      setIsTournamentModalOpen(true);
    }
  }, [inputError, createTournamentCount]);

  // removes all auctions from selectedData
  const handleRemoveAuctions = () => {
    setSelectedData(null);
  };

  // remove button on selected auctions card
  const handleRemoveSelectedAuction = (id: string) => {
    if (selectedData) {
      const newSelectedData = selectedData.filter((item) => item._id !== id);
      setSelectedData(newSelectedData);
    }
  };

  // adds auction to selectedData
  const handleCheckbox = (
    _id: string,
    title: string,
    deadline: string,
    auction_id: string,
    image: string
  ) => {
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
      if (prevSelectedData.length < 5) {
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
      }
      return prevSelectedData;
    });

    // update tournamentObject
    setTournamentObject((prevTournamentObj: TournamentObjectType) => {
      //if there is no auctionID field, add and include current auctionID
      if (!prevTournamentObj.auctionID) {
        return { ...prevTournamentObj, auctionID: [_id] };
      }
      let auctionArray = [...prevTournamentObj.auctionID];
      if (auctionArray.includes(_id)) {
        auctionArray = auctionArray.filter((itemID) => itemID !== _id);
      } else {
        if (auctionArray.length < 5) {
          auctionArray.push(_id);
        }
      }
      return { ...prevTournamentObj, auctionID: auctionArray };
    });
    return;
  };

  // sets max date for endTime and tournamentEndTime
  useEffect(() => {
    const changeMaxDateTimeOption = () => {
      if (selectedData != null && selectedData.length > 0) {
        const earliestDate = selectedData.reduce(
          (acc: Date, curr: SelectedDataType) => {
            const currDate = new Date(curr.deadline);
            return currDate < acc ? currDate : acc;
          },
          new Date(selectedData[0].deadline)
        );
        setDateLimit((prev) => ({ ...prev, end: earliestDate }));
      }
    };

    const changetournamentEndTime = () => {
      if (selectedData != null && selectedData.length > 0) {
        let latestDate = selectedData.reduce(
          (acc: Date, curr: SelectedDataType) => {
            const currDate = new Date(curr.deadline);
            return currDate > acc ? currDate : acc;
          },
          new Date(selectedData[0].deadline)
        );
        // Add one day to latestDate
        latestDate.setDate(latestDate.getDate() + 1);
        setTournamentEndTime(latestDate);
        setTournamentObject((prev: TournamentObjectType | null) => ({
          ...prev,
          tournamentEndTime: latestDate.toISOString(),
        }));
      }
    };

    changetournamentEndTime();
    changeMaxDateTimeOption();

    // sets tournamentEndTime to null if no selectedData
    if (selectedData != null && selectedData.length == 0)
      setTournamentEndTime(null);
  }, [selectedData]);

  // close all dropdowns
  const closeAllDropdowns = () => {
    setMakeDropdown(false);
    setCategoryDropdown(false);
    setEraDropdown(false);
    setLocationDropdown(false);
    setSortDropdown(false);
  };

  // handle toggle dropdown, only one is open at all times
  const handleToggleDropdown = (dropdown: string) => {
    switch (dropdown) {
      case "make":
        setMakeDropdown((prev) => !prev);
        break;
      case "category":
        setCategoryDropdown((prev) => !prev);
        break;
      case "era":
        setEraDropdown((prev) => !prev);
        break;
      case "location":
        setLocationDropdown((prev) => !prev);
        break;
      case "sort":
        setSortDropdown((prev) => !prev);
        break;
      default:
        closeAllDropdowns();
    }
    if (dropdown !== "make") {
      setMakeDropdown(false);
    }
    if (dropdown !== "category") {
      setCategoryDropdown(false);
    }
    if (dropdown !== "era") {
      setEraDropdown(false);
    }
    if (dropdown !== "location") {
      setLocationDropdown(false);
    }
    if (dropdown !== "sort") {
      setSortDropdown(false);
    }
  };

  // handle clicking outside of dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        closeAllDropdowns();
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
      setFilters((prev: any) => {
        return { ...prev, [key]: value };
      });
    } else {
      setFilters((prev: any) => {
        // check for prev and if key exists
        if (prev == undefined || !prev[key] === undefined) {
          return { ...prev };
        }
        // if value is 'All', remove all other items and add 'All' to the array
        if (value === "All") {
          return { ...prev, [key]: ["All"] };
        }
        // if 'All' is included in the array, remove it and add the value
        if (prev[key]?.includes("All")) {
          return {
            ...prev,
            [key]: prev[key]
              .filter((item: any) => item !== "All")
              .concat(value),
          };
        }
        // if value is not included in the array, add it
        if (!prev[key]?.includes(value)) {
          return {
            ...prev,
            [key]: prev[key].concat(value),
          };
        }
        // if value is included in the array, remove it
        if (prev[key]?.includes(value)) {
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
    }
    closeAllDropdowns();
  };

  // handle clicking outside of mobile dropdown of filters
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMobileDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="section-container tw-mt-4 tw-flex tw-flex-col tw-gap-4">
      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-justify-between tw-gap-4">
        <div className="tw-text-xl md:tw-text-2xl tw-font-bold">
          Create Tournament
        </div>
        <button className="btn-yellow" onClick={handleCheckTournamentObj}>
          CREATE TOURNAMENT
        </button>
      </div>
      {inputError != null && (
        <div className="tw-text-black tw-font-bold tw-bg-red-600 tw-rounded tw-text-center tw-py-2">
          {inputErrorMessages[inputError as keyof typeof inputErrorMessages]}
        </div>
      )}
      <div className="tw-flex tw-flex-col md:tw-flex-row tw-gap-4">
        {/* left column */}
        <div className="tw-flex tw-flex-col tw-w-full md:tw-w-2/5 tw-gap-4">
          {/* tournament information */}
          <div className="tw-w-full tw-min-h-[200px] tw-bg-white/5 tw-rounded tw-p-4 md:tw-p-8 tw-flex tw-flex-col tw-gap-4 ">
            <div className="tw-text-xl tw-font-bold">
              Tournament Information
            </div>
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                placeholder="title"
                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                onChange={handleInputChange}
              />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              <label htmlFor="title">Description</label>
              <input
                id="description"
                name="description"
                placeholder="description"
                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                onChange={handleInputChange}
              />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              <label htmlFor="startTime">Start Date and Time</label>
              <input
                id="startTime"
                name="startTime"
                type="datetime-local"
                placeholder="Start Time"
                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                min={dateLimit.start.toISOString().split(".")[0]}
                max={dateLimit.end.toISOString().split(".")[0]}
                onChange={handleInputChange}
              />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              <label htmlFor="endTime">End Date and Time</label>
              <input
                id="endTime"
                name="endTime"
                type="datetime-local"
                placeholder="end Time"
                className="tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded tw-text-black"
                min={dateLimit.start.toISOString().split(".")[0]}
                max={dateLimit.end.toISOString().split(".")[0]}
                onChange={handleInputChange}
              />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              <label htmlFor="buyInFee">Buy-in Price</label>
              <input
                id="buyInFee"
                name="buyInFee"
                type="number"
                placeholder="buy-in price"
                className="tw-text-black tw-px-2 tw-py-1.5 tw-flex-grow tw-rounded"
                onChange={handleInputChange}
              />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-1.5">
              <label htmlFor="tournamentEndTime">Tournament End Time</label>
              <div className="tw-pl-2 tw-opacity-50">
                {tournamentEndTime != null
                  ? tournamentEndTime?.toISOString().split(".")[0]
                  : "--"}
              </div>
            </div>
          </div>
          <div className="tw-w-full tw-bg-white/5 tw-rounded tw-p-4 md:tw-p-8 tw-flex tw-flex-col tw-gap-4">
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
                    selectAuctionModalID={selectAuctionID}
                    setAuctionModalOpen={() => setIsAuctionModalOpen(true)}
                    handleRemoveSelectedAuction={handleRemoveSelectedAuction}
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
        <div className="tw-flex tw-flex-col tw-w-full md:tw-w-3/5 tw-gap-4 tw-bg-white/5 tw-p-4 md:tw-p-8">
          <div className="tw-text-lg tw-font-bold">
            Auctions
            <span className="tw-opacity-20 tw-ml-2">{totalAuctions}</span>
          </div>
          <div
            className="tw-relative tw-w-fit tw-flex tw-gap-4"
            ref={filterRef as unknown as RefObject<HTMLDivElement> | undefined}
          >
            <div>Filters:</div>
            {/* Dropdowns for make, category, era and filter */}
            {/* desktop view */}
            <div className="tw-hidden lg:tw-flex tw-gap-3">
              {ListOfFilters.map((item: string, index: number) => {
                const data = FiltersDataContent[item];
                return (
                  <div key={String(index + item)}>
                    <div
                      onClick={() => handleToggleDropdown(data.filterKey)}
                      className="tw-w-[100px] tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                    >
                      {item}
                    </div>
                    {data.dropdown && (
                      <DropdownComponent
                        filterKey={data.filterKey}
                        content={data.content}
                        columns={data.columns}
                        handleCheckboxFilters={handleCheckboxFilters}
                        filters={filters}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className=" tw-block lg:tw-hidden">
              {
                <div>
                  <Image
                    src={FunnelFilter}
                    alt="funnel filter"
                    width={24}
                    height={24}
                    className="tw-w-6 tw-h-6"
                    onClick={() => setIsMobileDropdownOpen((prev) => !prev)}
                  />

                  {isMobileDropdownOpen && (
                    <div
                      ref={filterDropdownRef}
                      className=" dropdown_menu-6 tw-absolute tw-w-[100px] tw-h-auto tw-bg-[#DCE0D9] tw-rounded-xl tw-left-0 tw-z-10"
                    >
                      {ListOfFilters.map((item: string, index: number) => {
                        const data = FiltersDataContent[item];
                        return (
                          <div
                            key={String(index + item)}
                            className="tw-relative"
                          >
                            <div
                              onClick={() =>
                                handleToggleDropdown(data.filterKey)
                              }
                              className="tw-w-[100px] tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                            >
                              {item}
                            </div>
                            {data.dropdown && (
                              <div className="tw-absolute tw-left-24 tw-top-0">
                                <DropdownComponent
                                  filterKey={data.filterKey}
                                  content={data.content}
                                  columns={data.columnsSM}
                                  handleCheckboxFilters={handleCheckboxFilters}
                                  filters={filters}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              }
            </div>

            <div>Sort:</div>
            <div>
              {/* desktop view */}
              <div className=" tw-hidden lg:tw-flex">
                <div
                  onClick={() => handleToggleDropdown("sort")}
                  className="tw-py-2 tw-px-4 tw-rounded-lg tw-bg-[#DCE0D9] tw-text-black tw-cursor-pointer"
                >
                  sort
                </div>
              </div>
              {/* mobile view */}
              <div className=" tw-block lg:tw-hidden">
                <Image
                  src={ArrowDown}
                  alt="arrow down"
                  width={24}
                  height={24}
                  className="tw-w-6 tw-h-6"
                  onClick={() => handleToggleDropdown("sort")}
                />
              </div>
              {sortDropdown && (
                <DropdownComponent
                  filterKey="sort"
                  content={SortDropdownContent}
                  columns={1}
                  handleCheckboxFilters={handleCheckboxFilters}
                  filters={filters}
                />
              )}
            </div>
          </div>
          {/* Auctions List */}
          <div className=" md:tw-h-[1000px] tw-rounded-xl tw-bg-white/20 md:tw-overflow-scroll tw-px-4">
            {!isLoading ? (
              <>
                {emptyAuctions && <div>No results found...</div>}
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
                        handleCheckbox={handleCheckbox}
                        selected={
                          selectedData
                            ? selectedData.some((data) => data._id === item._id)
                            : false
                        }
                        selectAuctionModalID={selectAuctionID}
                        setAuctionModalOpen={() => setIsAuctionModalOpen(true)}
                      />
                    );
                  })}
              </>
            ) : (
              <div className="tw-py-[200px]">
                <LoadingComponent loaderType="bounceLoader" />
              </div>
            )}
            {!isLoading && !loadmoreLoading ? (
              <div className="tw-h-[100px] tw-flex tw-flex-col tw-justify-center tw-items-center">
                <div className="tw-pb-2">{`Showing ${displayCount} out of ${totalAuctions}`}</div>
                {loadMoreButton && (
                  <button className="btn-white" onClick={handleLoadMore}>
                    Load More
                  </button>
                )}
              </div>
            ) : (
              !isLoading &&
              loadmoreLoading && <LoadingComponent loaderType="beatLoader" />
            )}
          </div>
        </div>
      </div>
      {/* Tournament Modal */}
      {tournamentObject && (
        <TournamentModal
          isOpen={isTournamentModalOpen}
          onClose={() => setIsTournamentModalOpen(false)}
          selectedData={selectedData as SelectedDataType[]}
          data={tournamentObject as TournamentObjectType}
          successfullyPosted={successfullyPosted}
          handleCreateTournament={handleCreateTournament}
          createTournamentLoading={createTournamentLoading}
          unsuccessfulPosting={unsuccessfulPosting}
        />
      )}
      {isAuctionModalOpen && (
        <AuctionModal
          isOpen={isAuctionModalOpen}
          onClose={() => setIsAuctionModalOpen(false)}
          id={selectedAuctionId}
        />
      )}
    </div>
  );
};

export default CreateTournamentsPage;
