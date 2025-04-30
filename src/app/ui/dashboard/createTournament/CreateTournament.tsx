import Image from "next/image";
import CarPhoto from "../../../../../public/images/car-photo.svg";
import HourGlass from "@/../public/images/hourglass.svg";
import Checkbox from "@mui/material/Checkbox";
import { getCarsWithFilter } from "@/app/lib/data";
import { boolean, number } from "zod";
import { Button } from "@mui/material";
import { BounceLoader, BeatLoader } from "react-spinners";
import { DateTime } from "luxon";

type HandleCheckboxType = (
  _id: string,
  title: string,
  deadline: string,
  auction_id: string,
  image: string
) => void;

type tournamentsListCardData = {
  auctionID: string;
  _id: string;
  image: string;
  title: string;
  description: string[];
  deadline: string;
  handleCheckbox: HandleCheckboxType;
  selected: boolean;
  selectAuctionModalID: (id: string) => void;
  setAuctionModalOpen: () => void;
};

export interface SelectedDataType {
  _id: string;
  title: string;
  deadline: string;
  auction_id: string;
  image: string;
}

// loading spinner
export const LoadingComponent = ({
  loaderType,
}: {
  loaderType: "bounceLoader" | "beatLoader";
}) => {
  return (
    <div className={`h-[100px] flex justify-center items-center`}>
      {loaderType == "bounceLoader" ? (
        <BounceLoader color="#F2CA16" />
      ) : (
        <BeatLoader color="#F2CA16" />
      )}
    </div>
  );
};

export const TournamentsListCard: React.FC<tournamentsListCardData> = ({
  auctionID,
  _id,
  image,
  title,
  description,
  deadline,
  handleCheckbox,
  selected,
  selectAuctionModalID,
  setAuctionModalOpen,
}) => {
  // convert deadline to date format
  const dateTime = DateTime.fromISO(deadline).toFormat("MM/dd/yy hh:mm a");

  const handleClick = () => {
    selectAuctionModalID(auctionID);
    setAuctionModalOpen();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-6 mt-6 md:pl-4">
        <div className="w-full md:w-1/3 flex items-center gap-2 md:gap-4">
          <Checkbox
            checked={selected}
            value={auctionID}
            sx={{
              "& .MuiSvgIcon-root": { fontSize: 28 },
              color: "white",
            }}
            onClick={(e) =>
              handleCheckbox(_id, title, deadline, auctionID, image)
            }
          />
          <img
            src={image}
            width={416}
            height={240}
            alt={title}
            className="w-4/5 h-[100px] md:h-[200px] object-cover aspect-auto cursor-pointer"
            onClick={handleClick}
          />
        </div>
        <div className="w-full lg:w-2/3 flex flex-col">
          <div className="opacity-30 text-md md:text-lg font-bold">
            Auction ID: {auctionID}
          </div>
          <div className="text-lg md:text-2xl font-bold mt-3">{title}</div>
          <div className="text-sm md:text-md h-[4rem] ellipsis overflow-hidden">
            {description.map((item, index) => (
              <p key={index}>{item}</p>
            ))}
          </div>
          <div className="text-sm md:text-md flex mt-4">
            <Image
              src={HourGlass}
              width={20}
              height={20}
              alt="car"
              className="w-5 h-5"
            />
            <span className="text-[#F2CA16] font-bold ml-2">{dateTime}</span>
          </div>
        </div>
      </div>

      <div className="bg-white/5 h-[1.5px] mt-6"></div>
    </div>
  );
};

type SelectedCardProps = SelectedDataType & {
  handleRemoveSelectedAuction: (id: string) => void;
  selectAuctionModalID: (id: string) => void;
  setAuctionModalOpen: () => void;
};

// card for selected auctions
export const SelectedCard: React.FC<SelectedCardProps> = ({
  _id,
  title,
  deadline,
  auction_id,
  image,
  selectAuctionModalID,
  setAuctionModalOpen,
  handleRemoveSelectedAuction,
}) => {
  const handleClick = () => {
    selectAuctionModalID(auction_id);
    setAuctionModalOpen();
  };

  return (
    <div className="flex gap-4 border-solid border-2 border-white border py-3 px-2 rounded">
      <img
        src={image}
        alt={title}
        width={100}
        height={100}
        className="w-[100px] h-[100px] object-cover cursor-pointer"
        onClick={handleClick}
      />
      <div className="grid gap-2">
        <div>
          Auction ID: <span>{auction_id}</span>
        </div>
        <div>
          Title: <span>{title}</span>
        </div>
        <div>
          Deadline:{" "}
          <span>{DateTime.fromISO(deadline).toFormat("MM/dd/yy hh:mm a")}</span>
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
export const DropdownComponent: React.FC<DropdownComponentProps> = ({
  filterKey,
  content,
  columns,
  handleCheckboxFilters,
  filters,
}) => {
  return (
    <div
      className={`dropdown_menu-6 absolute w-[200px] md:w-fit bg-[#DCE0D9] text-black py-3 px-4 rounded-lg shadow-lg h-[400px] md:h-auto max-h-[500px] overflow-scroll z-20 ${
        filterKey == "sort" ? "right-0" : ""
      }`}
    >
      <ul className={`grid grid-cols-${columns} gap-3`}>
        {content.map((item: string, index: number) => (
          <li key={String(index + item)} className="flex items-center">
            <div>
              <Checkbox
                checked={filters ? filters[filterKey]?.includes(item) : false}
                onClick={() => handleCheckboxFilters(filterKey, item)}
              />
            </div>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
