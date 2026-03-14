"use client";

import { useEffect, useRef } from "react";

export default function ClientSecurity() {
    const isClient = typeof window !== "undefined";
    const debuggerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isClient) return;

        // 1. Block Keyboard Shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12
            if (e.key === "F12" || e.keyCode === 123) {
                e.preventDefault();
                return false;
            }

            // Block Ctrl+Shift+I / Cmd+Option+I (DevTools)
            // Block Ctrl+Shift+J / Cmd+Option+J (Console)
            // Block Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
                e.preventDefault();
                return false;
            }

            // Block Ctrl+U / Cmd+Option+U (View Source)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                return false;
            }
        };

        // 2. Block Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        // 3. Debugger Trap (Anti-debugging loop)
        // If they open DevTools from the browser menu, this will freeze the console
        // making it very difficult to execute commands or inspect elements comfortably.
        const startDebuggerTrap = () => {
             // We use a self-invoking function to make it slightly harder to bypass via simple console overrides
            (function trap() {
                try {
                    // This causes the browser to pause execution if DevTools is open
                    // eslint-disable-next-line no-debugger
                    debugger;
                } catch (err) {
                    // Ignore
                }
            })();
        };

        // Start the trap loop every 100ms
        debuggerIntervalRef.current = setInterval(startDebuggerTrap, 100);

        // Attach listeners
        window.addEventListener("keydown", handleKeyDown, { capture: true });
        window.addEventListener("contextmenu", handleContextMenu, { capture: true });

        return () => {
            window.removeEventListener("keydown", handleKeyDown, { capture: true });
            window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
            if (debuggerIntervalRef.current) {
                clearInterval(debuggerIntervalRef.current);
            }
        };
    }, [isClient]);

    return null; // This component doesn't render anything visually
}
