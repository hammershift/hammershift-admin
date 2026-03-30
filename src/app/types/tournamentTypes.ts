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

export interface EntryTierInput {
  name: string;
  buyInAmount: number;
  prizeMultiplier: number;
  maxEntries: number;
  currentEntries: number;
}

export interface TournamentObjectType {
  title?: string;
  description?: string;
  buyInFee?: number;
  startTime?: string;
  endTime?: string;
  tournamentEndTime?: string;
  auctionID?: string[];
  rakePercent?: number;
  scoring_version?: string;
  entryTiers?: EntryTierInput[];
  autoCreatedStatus?: string;
  isAutoCreated?: boolean;
}
