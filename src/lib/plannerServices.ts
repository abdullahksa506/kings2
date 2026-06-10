"use client";

/*
 * 🤖 نكتة AI:
 * الملك سأل المخطّط: وين نروح؟
 * المخطّط: عندي ١١ ألف مطعم وأنت تبي البيك... عادي 😂🍔
 */

import { invokeRpc } from "./services";

export interface PlanSuggestion {
    name: string;
    cuisines: string[];
    district: string;
    perPerson: number;
    rating: number;
    lat: number;
    lng: number;
    mapsUrl: string;
    reasons: string[];
    visitedBefore: boolean;
    matchScore: number;
}

export interface PlanResult {
    parsed: {
        cuisines: string[];
        district: string | null;
        maxTier: number | null;
        minTier: number | null;
        wantsNew: boolean;
        wantsFavorite: boolean;
        maxPerPerson: number | null;
    };
    suggestions: PlanSuggestion[];
    totalMatched: number;
}

export const plannerServices = {
    plan(query: string): Promise<PlanResult> {
        return invokeRpc("planOuting", { query });
    },
};
