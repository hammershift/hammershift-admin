export interface TournamentType {
    _id: string;
    title: string;
    pot: string;
    buyInFee: number;
    startTime: string;
    endTime: string;
    tournamentEndTime: string;
    status: number;
    auctionIdentifierId: string;
    auctionID: string;
    isActive: boolean;
    createdAt: string;
}
