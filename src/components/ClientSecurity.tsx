"use client";

import { useEffect, useRef } from "react";

export default function ClientSecurity() {
    const isClient = typeof window !== "undefined";
    const debuggerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const devtoolsCheckRef = useRef<NodeJS.Timeout | null>(null);

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
        const startDebuggerTrap = () => {
            (function trap() {
                try {
                    // eslint-disable-next-line no-debugger
                    debugger;
                } catch (err) { /* Ignore */ }
            })();
        };

        // 4. DevTools Detection via window size difference
        // When DevTools is docked, window.outerWidth/Height differs significantly from innerWidth/Height
        const checkDevToolsBySize = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            if (widthThreshold || heightThreshold) {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#ef4444;font-size:24px;font-weight:bold;text-align:center;direction:rtl;padding:20px;">⛔ تم رصد محاولة فحص غير مصرح بها<br/><span style="font-size:14px;color:#64748b;margin-top:12px;display:block;">أغلق أدوات المطور وأعد تحميل الصفحة</span></div>';
            }
        };

        // 5. DevTools Detection via console timing
        // console.log with a getter fires only when DevTools console is open
        const checkDevToolsByConsole = () => {
            const element = new Image();
            let devtoolsOpen = false;
            Object.defineProperty(element, 'id', {
                get: function() {
                    devtoolsOpen = true;
                    return '';
                }
            });
            // Clear console to trigger the getter
            console.log('%c', element as any);
            if (devtoolsOpen) {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#ef4444;font-size:24px;font-weight:bold;text-align:center;direction:rtl;padding:20px;">⛔ تم رصد محاولة فحص غير مصرح بها<br/><span style="font-size:14px;color:#64748b;margin-top:12px;display:block;">أغلق أدوات المطور وأعد تحميل الصفحة</span></div>';
            }
        };

        // 6. Block paste into console (override console methods)
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const warningMessage = '⛔ هذه المنطقة مقيدة. أي محاولة تلاعب ستؤدي لحظر حسابك.';
        
        console.log = function(...args: any[]) {
            if (args.length === 1 && args[0] === '%c') {
                // Allow our detection to work
                originalLog.apply(console, args);
                return;
            }
            originalLog.call(console, warningMessage);
        };
        console.warn = function() { originalWarn.call(console, warningMessage); };
        console.error = function() { originalError.call(console, warningMessage); };

        // Start intervals
        debuggerIntervalRef.current = setInterval(startDebuggerTrap, 100);
        devtoolsCheckRef.current = setInterval(() => {
            checkDevToolsBySize();
            checkDevToolsByConsole();
        }, 1000);

        // Run immediately too
        checkDevToolsBySize();

        // Attach listeners
        window.addEventListener("keydown", handleKeyDown, { capture: true });
        window.addEventListener("contextmenu", handleContextMenu, { capture: true });

        return () => {
            window.removeEventListener("keydown", handleKeyDown, { capture: true });
            window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
            if (debuggerIntervalRef.current) clearInterval(debuggerIntervalRef.current);
            if (devtoolsCheckRef.current) clearInterval(devtoolsCheckRef.current);
            // Restore console
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, [isClient]);

    return null;
}
