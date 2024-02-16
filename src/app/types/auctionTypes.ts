export interface AuctionType {
    _id: string;
    attributes: { key: string; value: string | number; _id: string }[];
    auction_id: string;
    website: string;
    image: string;
    page_url: string;
    isActive: boolean;
    views: number;
    watchers: number;
    comments: number;
    description: string[];
    image_list: { placing: number; src: string }[];
    listing_details: string[];
    sort: { price: number; bids: number; deadline: Date };
    createdAt: Date;
    updatedAt: Date;
    tournament_id?: string[];
    pot?: number;
}
