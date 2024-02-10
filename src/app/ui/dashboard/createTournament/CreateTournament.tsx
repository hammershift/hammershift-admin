import Image from "next/image";
import CarPhoto from "../../../../../public/images/car-photo.svg";
import HourGlass from "@/../public/images/hourglass.svg";
import Checkbox from "@mui/material/Checkbox";
import { getCarsWithFilter } from "@/app/lib/data";
import { boolean, number } from "zod";
import { Button } from "@mui/material";
import { BounceLoader } from "react-spinners";
import { set } from "mongoose";

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
    convertDateStringToDateTime: (dateString: string) => string;
    handleCheckbox: HandleCheckboxType;
    selected: boolean;
};

interface SelectedDataType {
    _id: string;
    title: string;
    deadline: string;
    auction_id: string;
    image: string;
}

// loading spinner
export const LoadingComponent = ({ height }: { height: number }) => {
    return (
        <div
            className={`tw-h-[${height}px] tw-flex tw-justify-center tw-items-center`}
        >
            <BounceLoader color="#F2CA16" />
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
export const SelectedCard: React.FC<SelectedCardProps> = ({
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
export const DropdownComponent: React.FC<DropdownComponentProps> = ({
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
