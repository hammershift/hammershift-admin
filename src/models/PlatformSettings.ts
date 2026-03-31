import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEntryTierDefault {
  name:            string;
  buyInAmount:     number;
  prizeMultiplier: number;
  maxEntries:      number;
  enabled:         boolean;
}

export interface IAnnouncementBanner {
  id:          string;
  text:        string;
  color:       string;
  dismissable: boolean;
  startDate:   Date | null;
  endDate:     Date | null;
  active:      boolean;
  createdAt:   Date;
}

export interface IPlatformSettings extends Document {
  defaultRakePercent:    number;
  defaultPayoutStructure:{
    first:  number;
    second: number;
    third:  number;
  };
  defaultEntryTiers:     IEntryTierDefault[];
  minBuyIn:              number;
  maxBuyIn:              number;
  defaultAuctionsPerTournament: number;
  velocityPointsDailyAllowance: number;
  velocityPointsStartBalance:   number;
  featureFlags: {
    tournamentsEnabled:     boolean;
    guessTheHammerEnabled:  boolean;
    freePlayEnabled:        boolean;
    realMoneyEnabled:       boolean;
    maintenanceMode:        boolean;
    signupsEnabled:         boolean;
  };
  announcementBanners: IAnnouncementBanner[];
  lastUpdatedBy: string;
  updatedAt:     Date;
  createdAt:     Date;
}

const EntryTierDefaultSchema = new Schema<IEntryTierDefault>({
  name:            { type: String, required: true },
  buyInAmount:     { type: Number, required: true, min: 0 },
  prizeMultiplier: { type: Number, required: true, min: 0 },
  maxEntries:      { type: Number, required: true, min: 1 },
  enabled:         { type: Boolean, default: true },
}, { _id: false });

const AnnouncementBannerSchema = new Schema<IAnnouncementBanner>({
  id:          { type: String, required: true },
  text:        { type: String, required: true },
  color:       { type: String, default: '#F2CA16' },
  dismissable: { type: Boolean, default: true },
  startDate:   { type: Date, default: null },
  endDate:     { type: Date, default: null },
  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: () => new Date() },
}, { _id: false });

const PlatformSettingsSchema = new Schema(
  {
    _id: { type: String, default: 'singleton' },
    defaultRakePercent: { type: Number, default: 10, min: 0, max: 50 },
    defaultPayoutStructure: {
      first:  { type: Number, default: 50 },
      second: { type: Number, default: 30 },
      third:  { type: Number, default: 20 },
    },
    defaultEntryTiers: {
      type: [EntryTierDefaultSchema],
      default: [
        { name: 'Free',   buyInAmount: 0,  prizeMultiplier: 0,  maxEntries: 1000, enabled: true },
        { name: 'Bronze', buyInAmount: 5,  prizeMultiplier: 1,  maxEntries: 500,  enabled: true },
        { name: 'Silver', buyInAmount: 15, prizeMultiplier: 3,  maxEntries: 200,  enabled: true },
        { name: 'Gold',   buyInAmount: 50, prizeMultiplier: 10, maxEntries: 50,   enabled: true },
      ],
    },
    minBuyIn:   { type: Number, default: 0 },
    maxBuyIn:   { type: Number, default: 500 },
    defaultAuctionsPerTournament: { type: Number, default: 15 },
    velocityPointsDailyAllowance: { type: Number, default: 100 },
    velocityPointsStartBalance:   { type: Number, default: 500 },
    featureFlags: {
      tournamentsEnabled:    { type: Boolean, default: true },
      guessTheHammerEnabled: { type: Boolean, default: true },
      freePlayEnabled:       { type: Boolean, default: true },
      realMoneyEnabled:      { type: Boolean, default: true },
      maintenanceMode:       { type: Boolean, default: false },
      signupsEnabled:        { type: Boolean, default: true },
    },
    announcementBanners: { type: [AnnouncementBannerSchema], default: [] },
    lastUpdatedBy: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'platform_settings',
    _id: false,
  }
);

const PlatformSettings: Model<IPlatformSettings> =
  (mongoose.models.PlatformSettings as Model<IPlatformSettings>) ||
  mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema, 'platform_settings');

export default PlatformSettings;
