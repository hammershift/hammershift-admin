"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import magnifyingGlass from "@/../public/images/magnifying-glass.svg";
import { useSession } from "next-auth/react";
import { BeatLoader } from "react-spinners";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/ui/components/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/app/ui/components/card";
import { Button } from "@/app/ui/components/button";
import { Input } from "../../components/input";
import { Badge } from "@/app/ui/components/badge";
import { CarData } from "@/app/dashboard/auctions/page";
import ResponsivePagination from "react-responsive-pagination";
//import "react-responsive-pagination/themes/classic.css";
import "react-responsive-pagination/themes/minimal-light-dark.css";
import { updateAuctionStatus, promptAgentPredictions } from "@/app/lib/data";

import {
  Car,
  Search,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  ImageOff,
  RefreshCcw,
  Filter,
  Calendar,
} from "lucide-react";
interface AuctionsPageProps {
  auctionData: CarData[];
  handleLoadMore: () => void; //TODO: change to pagination instead
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  displayCount: number;
  totalCars: number;
  searchedData: CarData[];
  searchedKeyword: String;
  setCurrentPage: (page: number) => void;
  handleSearch: (input: string) => void;
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({
  auctionData: auctionData,
  handleLoadMore,
  currentPage,
  totalPages,
  isLoading,
  displayCount,
  totalCars,
  searchedData,
  searchedKeyword,
  setCurrentPage,
  handleSearch,
}) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});
  const [viewportWidth, setViewportWidth] = useState(0);
  const [feedTab, setFeedTab] = useState<string>("external");

  const [showModal, setShowModal] = useState(false);
  const [sort, setSort] = useState({
    keyToSort: "auction_id",
    direction: "asc",
  });
  const [searchString, setSearchString] = useState<string>("");

  const { data } = useSession();

  useEffect(() => {
    setViewportWidth(window.innerWidth);

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSearch(searchString);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchString, handleSearch]);
  useEffect(() => {
    // TODO: might have to rewrite this when using pagination and search
    const initialActiveAuctions = auctionData.reduce(
      (acc, item) => ({
        ...acc,
        [item.auction_id]: item.isActive,
      }),
      {}
    );

    setActiveAuctions(initialActiveAuctions);
  }, [auctionData, searchedData, searchedKeyword]);

  function sortData(rowToSort: any[]) {
    const sortedData = [...rowToSort];
    if (sort.direction === "asc") {
      return sortedData.sort((a: any, b: any) =>
        a[sort.keyToSort] > b[sort.keyToSort] ? 1 : -1
      );
    }
    return sortedData.sort((a: any, b: any) =>
      a[sort.keyToSort] > b[sort.keyToSort] ? -1 : 1
    );
  }

  return (
    <div className="section-container mt-4">
      <div className="flex flex-col justify-between">
        <h1 className="text-3xl font-bold mb-8 text-yellow-500">
          Car Management
        </h1>
        <div className="bg-[#13202D] relative h-auto flex px-2 py-1.5 rounded gap-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" />
          <Input
            placeholder="Search by make, model, or year"
            className="pl-10 text-white bg-transparent focus:outline-none placeholder:text-white border-none"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchString(e.target.value)
            }
          />
        </div>
      </div>
      <Tabs value={feedTab} onValueChange={setFeedTab} className="mb-6 mt-6">
        <TabsList className="grid grid-cols-2 bg-[#13202D]">
          <TabsTrigger
            value="external"
            className={`border-2 ${
              feedTab === "external"
                ? " border-yellow-400"
                : "border-transparent"
            }`}
          >
            External Feed
          </TabsTrigger>
          <TabsTrigger
            value="platform"
            className={`border-2 ${
              feedTab === "platform"
                ? "border-yellow-400"
                : "border-transparent"
            }  `}
          >
            Platform Auctions
          </TabsTrigger>
        </TabsList>
        {isLoading ? (
          <div className="flex justify-center items-center h-[618px]">
            <BeatLoader color="#F2CA16" />
          </div>
        ) : (
          <TabsContent value="external">
            <Card className="bg-[#13202D] border-[#1E2A36]">
              <CardHeader>
                <CardTitle>External Car Feed</CardTitle>
                <CardDescription>
                  Cars available from external feed. Add them to your platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {auctionData.map((auction) => (
                    <Card
                      key={auction.auction_id}
                      className="bg-[#1E2A36] border-[#1E2A36] overflow-hidden flex flex-col"
                    >
                      <div className="relative h-48 bg-gray-800">
                        {auction.image ? (
                          <Image
                            src={auction.image}
                            alt={`${auction.year} ${auction.make} ${auction.model}`}
                            title={`${auction.year} ${auction.make} ${auction.model}`}
                            className="w-full h-full object-cover"
                            objectFit="cover"
                            fill
                          ></Image>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="w-12 h-12 text-gray-500" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2 bg-[#F2CA16] text-[#0C1924]">
                          {auction.make}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="text-xl font-bold mb-1 truncate">
                          {auction.year} {auction.make} {auction.model}
                        </h3>
                        <a
                          href={auction.page_url}
                          className="underline text-blue-600 hover:text-blue-800 visited:text-purple-600 text-sm mb-3"
                        >
                          {auction.page_url}
                        </a>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-gray-400">
                              Current Bid
                            </div>
                            <div className="text-[#F2CA16] font-bold">
                              ${auction.price}
                            </div>
                          </div>
                          <Badge
                            className={
                              auction.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {auction.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <Button className="w-full bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add to Platform
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {/* {filteredExternalCars.map((car) => (
                  <Card
                    key={car.id}
                    className="bg-[#1E2A36] border-[#1E2A36] overflow-hidden"
                  >
                    <div className="relative h-48 bg-gray-800">
                      {car.image_url ? (
                        <img
                          src={car.image_url}
                          alt={`${car.year} ${car.make} ${car.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-12 h-12 text-gray-500" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-[#F2CA16] text-[#0C1924]">
                        {car.make}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-xl font-bold mb-1">
                        {car.year} {car.make} {car.model}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3">
                        {car.description}
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-xs text-gray-400">
                            Current Bid
                          </div>
                          <div className="text-[#F2CA16] font-bold">
                            ${car.current_bid.toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          className={
                            car.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {car.status}
                        </Badge>
                      </div>
                      <Button
                        className="w-full bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                        onClick={() => handleAddToPlatform(car)}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add to Platform
                      </Button>
                    </CardContent>
                  </Card>
                ))} */}
                </div>

                {/* {filteredExternalCars.length === 0 && (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">No Cars Found</h3>
                  <p className="text-gray-400">
                    No cars match your search criteria
                  </p>
                </div>
              )} */}
              </CardContent>
              <CardFooter className="flex justify-between">
                {/* <div className="text-sm text-gray-400">
                Showing {filteredExternalCars.length} of{" "}
                {MOCK_EXTERNAL_CARS.length} cars
              </div> */}
                <Button variant="outline" className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Refresh Feed
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      {!isLoading && (
        <div className="mx-auto mb-8 w-1/3">
          <ResponsivePagination
            current={currentPage}
            total={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default AuctionsPage;
