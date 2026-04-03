"use client";

import { useEffect } from "react";

export default function ClientSecurity() {
    useEffect(() => {
        // Intentionally left empty to keep this component mounted without
        // applying client-side restrictions (F12, copy, right-click).
    }, []);

    return null;
}
