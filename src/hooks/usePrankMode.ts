"use client";

import { useEffect, useState } from "react";
import { listenToPrankConfig, PrankConfig, DEFAULT_CONFIG } from "@/lib/prankServices";

/**
 * Live-listens to the prank config for the current user. Returns a
 * normalized config; safe to use anywhere on the client.
 */
export function usePrankMode(userName: string | undefined | null): PrankConfig {
    const [cfg, setCfg] = useState<PrankConfig>({
        userName: userName || "",
        ...DEFAULT_CONFIG,
    });

    useEffect(() => {
        if (!userName) return;
        const unsub = listenToPrankConfig(userName, setCfg);
        return unsub;
    }, [userName]);

    return cfg;
}
