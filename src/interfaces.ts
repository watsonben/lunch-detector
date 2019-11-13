import { WebAPICallResult } from "@slack/web-api";

export interface LookupByEmailResult extends WebAPICallResult {
    user: {
        id: string;
    }
}

export interface ConversationsListResult extends WebAPICallResult {
    channels: {
        id: string;
        name: string;
        is_im: boolean;
        user: string;
    }[]
}

export interface UsersListResult extends WebAPICallResult {
    members: {
        id: string;
        deleted: boolean;
        profile: {
            real_name?: string;
            email: string;
        };
    }[];
}

export interface GetPermalinkResult extends WebAPICallResult {
    permalink: string;
}

export interface Event {
    text?: string;
    channel: string;
    user: string;
    ts: string;
}
