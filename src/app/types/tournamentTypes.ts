export interface TournamentType {
  _id: string;
  title: string;
  description: string;
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

export interface TournamentObjectType {
  title?: string;
  description?: string;
  buyInFee?: number;
  startTime?: string;
  endTime?: string;
  tournamentEndTime?: string;
  auctionID?: string[];
}
