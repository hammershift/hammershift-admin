import React from "react";

const TournamentsPage = () => {
    return <div>TournamentsPage</div>;
};

export default TournamentsPage;

export const AuctionIDDropdown = ({ list }: { list: string[] | string }) => {
    return (
        <div className="tw-absolute">
            {typeof list === "object" ? (
                list.map((item, index) => (
                    <div key={item + "Auctions"}>{item}</div>
                ))
            ) : (
                <div>{list}</div>
            )}
        </div>
    );
};
