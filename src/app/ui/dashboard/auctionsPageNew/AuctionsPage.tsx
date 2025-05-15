"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { BeatLoader, ClipLoader } from "react-spinners";
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
import { Switch } from "@/app/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/ui/components/table";
import { Button } from "@/app/ui/components/button";
import { Input } from "../../components/input";
import { Badge } from "@/app/ui/components/badge";
import { CarData } from "@/app/dashboard/auctions/page";
import ResponsivePagination from "react-responsive-pagination";
import { Prediction } from "@/app/models/prediction.model";
//import "react-responsive-pagination/themes/classic.css";
import "react-responsive-pagination/themes/minimal-light-dark.css";
import {
  updateAuctionStatus,
  promptAgentPredictions,
  getPredictions,
  deleteAgentPrediction,
} from "@/app/lib/data";
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
  CircleCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/app/ui/components/dialog";
import { set } from "mongoose";
interface AuctionsPageProps {
  auctionData: CarData[];
  currentPage: number;
  currentTab: string;
  totalPages: number;
  isLoading: boolean;
  searchedKeyword: String;
  setCurrentPage: (page: number) => void;
  setCurrentTab: (tab: string) => void;
  handleSearch: (input: string) => void;
}

const AuctionsPage: React.FC<AuctionsPageProps> = ({
  auctionData: auctionData,
  currentTab,
  currentPage,
  totalPages,
  isLoading,
  searchedKeyword,
  setCurrentPage,
  handleSearch,
  setCurrentTab,
}) => {
  const [activeAuctions, setActiveAuctions] = useState<{
    [key: string]: boolean;
  }>({});
  const [auctionLoadingStates, setAuctionLoadingStates] = useState<{
    [key: string]: string;
  }>({});
  const [viewingPredictions, setViewingPredictions] = useState<boolean>(false);
  const [currentAuction, setCurrentAuction] = useState<CarData>();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [refreshPrediction, setRefreshPrediction] = useState<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [sort, setSort] = useState({
    keyToSort: "auction_id",
    direction: "asc",
  });
  const [predictionLoading, setPredictionLoading] = useState<boolean>(false);
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

    const auctionLoadingStates = auctionData.reduce(
      (acc, item) => ({
        ...acc,
        [item.auction_id]: "off",
      }),
      {}
    );

    setAuctionLoadingStates(auctionLoadingStates);
    setActiveAuctions(initialActiveAuctions);
  }, [auctionData, searchedKeyword]);

  useEffect(() => {
    async function fetchPredictions() {
      if (currentAuction) {
        const predictions = await getPredictions(currentAuction.auction_id);
        setPredictions(predictions);
      } else {
        setPredictions([]);
      }

      setPredictionLoading(false);
    }
    fetchPredictions();
  }, [currentAuction, refreshPrediction]);

  async function handleViewPrediction(auction: CarData) {
    //get predictions from auction_id
    setCurrentAuction(auction);
    setPredictionLoading(true);
    setViewingPredictions(true);
  }

  async function handleDeleteAgentPrediction(id: string) {
    try {
      await deleteAgentPrediction(id);
      setRefreshPrediction(!refreshPrediction);
      setPredictionLoading(true);
    } catch (e) {
      console.error(e);
    }
  }
  async function handleStatusToggle(id: string) {
    const auction = auctionData.find((x) => x.auction_id === id);

    if (!auction) {
      alert("Auction not found");
      console.error("Auction not found");
      return;
    }
    if (
      !auction.isActive &&
      Date.parse(auction.deadline.toString()) < Date.now()
    ) {
      alert("Deadline has passed for this auction");
      return;
    }
    setAuctionLoadingStates((prevStates) => ({
      ...prevStates,
      [id]: "loading",
    }));
    setActiveAuctions((prevStates) => ({
      ...prevStates,
      [id]: !prevStates[id],
    }));

    try {
      if (!activeAuctions[id]) {
        await updateAuctionStatus(id, !activeAuctions[id]);
        await promptAgentPredictions(id);
      }
    } catch (error) {
      alert("An error has occured while enabling the auction.");
      console.error(error);
    } finally {
      setAuctionLoadingStates((prevStates) => ({
        ...prevStates,
        [id]: "added",
      }));
    }
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
      <Tabs
        value={currentTab}
        onValueChange={setCurrentTab}
        className="mb-6 mt-6"
      >
        <TabsList className="grid grid-cols-2 bg-[#13202D]">
          <TabsTrigger
            value="external"
            className={`border-2 ${
              currentTab === "external"
                ? " border-yellow-400"
                : "border-transparent"
            }`}
          >
            External Feed
          </TabsTrigger>
          <TabsTrigger
            value="platform"
            className={`border-2 ${
              currentTab === "platform"
                ? "border-yellow-400"
                : "border-transparent"
            }  `}
          >
            Platform Auctions
          </TabsTrigger>
        </TabsList>
        {isLoading && currentTab === "external" ? (
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
                        <p className="text-sm text-gray-400">
                          {auction.auction_id}
                        </p>
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
                              auction.isActive ||
                              auctionLoadingStates[auction.auction_id] ===
                                "added"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {auction.isActive ||
                            auctionLoadingStates[auction.auction_id] === "added"
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </div>
                        {auction.isActive ||
                        auctionLoadingStates[auction.auction_id] === "added" ? (
                          <Button
                            className="w-full bg-green-600 text-[#0C1924] cursor-default "
                            disabled
                          >
                            <CircleCheck className="mr-2 h-4 w-4" />
                            Added to Platform
                          </Button>
                        ) : auctionLoadingStates[auction.auction_id] ===
                          "loading" ? (
                          <Button
                            className="w-full bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                            disabled
                          >
                            <ClipLoader color="#000" />
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-[#F2CA16] text-[#0C1924] hover:bg-[#F2CA16]/90"
                            onClick={() =>
                              handleStatusToggle(auction.auction_id)
                            }
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add to Platform
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
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
                {/* <Button variant="outline" className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Refresh Feed
                </Button> */}
              </CardFooter>
            </Card>
          </TabsContent>
        )}
        {isLoading && currentTab === "platform" ? (
          <div className="flex justify-center items-center h-[618px]">
            <BeatLoader color="#F2CA16" />
          </div>
        ) : (
          <TabsContent value="platform">
            <Card className="bg-[#13202D] border-[#1E2A36]">
              <CardHeader>
                <CardTitle>Platform Cars</CardTitle>
                <CardDescription>
                  Manage cars that are currently on your platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Car</TableHead>
                        <TableHead>Current Bid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Visible</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auctionData.map((auction) => (
                        <TableRow key={auction.auction_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-md bg-gray-800 overflow-hidden">
                                {auction.image ? (
                                  <Image
                                    src={auction.image}
                                    alt={`${auction.year} ${auction.make} ${auction.model}`}
                                    title={`${auction.year} ${auction.make} ${auction.model}`}
                                    className="w-full h-full object-cover"
                                    objectFit="cover"
                                    width={100}
                                    height={100}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageOff className="w-6 h-6 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium truncate">
                                  {auction.year} {auction.make} {auction.model}
                                </div>
                                {/* <div className="text-sm text-gray-400">
                                  {car.description.substring(0, 30)}...
                                </div> */}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">
                            ${auction.price.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {/* TODO: Change to using status from attributes */}
                            <Badge
                              className={
                                Date.parse(auction.deadline.toString()) <
                                Date.now()
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {Date.parse(auction.deadline.toString()) <
                              Date.now()
                                ? "Active"
                                : "Ended"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {/* <Switch
                              checked={car.visible}
                              disabled={visibilityUpdating}
                              onCheckedChange={() =>
                                handleToggleVisibility(car.id, car.visible)
                              }
                            /> */}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Car"
                                onClick={() => handleEditCar(car)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button> */}

                              <Button
                                variant="ghost"
                                size="icon"
                                title="View Predictions"
                                className=""
                                onClick={() => handleViewPrediction(auction)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Game Timing"
                                onClick={() => handleEditGameTiming(car)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button> */}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {auctionData.length === 0 && (
                  <div className="text-center py-8">
                    <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Cars Found</h3>
                    <p className="text-gray-400">
                      No cars match your search criteria
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      <Dialog open={viewingPredictions} onOpenChange={setViewingPredictions}>
        <DialogContent className="bg-[#13202D] border-[#1E2A36]">
          <DialogHeader>
            <DialogTitle>Predictions</DialogTitle>
            <DialogDescription>
              {currentAuction &&
                `Viewing predictions for ${currentAuction.year} ${currentAuction.make} ${currentAuction.model}`}
            </DialogDescription>
          </DialogHeader>

          {predictionLoading ? (
            <div className="flex justify-center items-center w-full mt-4">
              <BeatLoader color="#F2CA16" />
            </div>
          ) : (
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((prediction) => (
                    <TableRow key={prediction._id.toString()}>
                      <TableCell>{prediction.user.username}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            prediction.user.role === "USER"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }
                        >
                          {prediction.user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${prediction.predictedPrice.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            prediction.refunded
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }
                        >
                          {prediction.refunded
                            ? "refunded"
                            : prediction.isActive
                            ? "active"
                            : "completed"}
                        </Badge>
                      </TableCell>
                      {prediction.user.role === "AGENT" && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Agent Prediction"
                            className=""
                            onClick={() =>
                              handleDeleteAgentPrediction(
                                prediction._id.toString()
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {predictions.length === 0 && (
                <div className="text-center py-8">
                  <h3 className="text-xl font-bold mb-2">No Predictions</h3>
                  <p className="text-gray-400">
                    This auction has no predictions yet
                  </p>
                </div>
              )}
              {/* {MOCK_PREDICTIONS.filter(pred => pred.car_id === viewingPredictions.id).length === 0 && (
                <div className="text-center py-8">
                  <h3 className="text-xl font-bold mb-2">No Predictions</h3>
                  <p className="text-gray-400">This car has no predictions yet</p>
                </div>
              )} */}
            </div>
          )}

          <DialogFooter>
            <Button className="" onClick={() => setViewingPredictions(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
