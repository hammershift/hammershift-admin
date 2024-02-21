export interface TournamentType {
    _id: string;
    title: string;
    pot: string;
    buyInFee: number;
    startTime: string;
    endTime: string;
    tournamentEndTime: string;
    status: number;
    auctionID: string[];
    isActive: boolean;
    createdAt: string;
}

export interface TournamentObject {
    title: string;
    buyInFee: number;
    startTime: string;
    endTime: string;
    tournamentEndTime: string;
    auctionID: string[];
}
