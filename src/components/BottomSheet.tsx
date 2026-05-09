"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    children: ReactNode;
    /** Max height as a tailwind h-[Xvh] override; defaults to 92vh */
    maxHeightClass?: string;
    /** Gradient/bg class applied to the header area (e.g., "from-amber-500/20 to-amber-700/10") */
    headerAccentClass?: string;
    /** Hide the default close button */
    hideCloseButton?: boolean;
}

export default function BottomSheet({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    maxHeightClass = "max-h-[92vh]",
    headerAccentClass = "from-amber-500/20 via-amber-500/5 to-transparent",
    hideCloseButton = false,
}: BottomSheetProps) {
    // ESC closes
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    // Lock body scroll while open
    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        // Drag down by 120px or fast flick down → close
        if (info.offset.y > 120 || info.velocity.y > 600) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 280 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={handleDragEnd}
                        className={`relative w-full max-w-2xl mx-auto bg-gradient-to-b from-slate-900 to-slate-950 border-t border-x border-amber-400/20 rounded-t-3xl shadow-[0_-25px_60px_rgba(0,0,0,0.6)] ${maxHeightClass} flex flex-col overflow-hidden`}
                    >
                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-12 h-1.5 rounded-full bg-slate-600/70" />
                        </div>

                        {/* Header */}
                        {(title || icon) && (
                            <div className={`bg-gradient-to-b ${headerAccentClass} px-4 pt-2 pb-3 shrink-0`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {icon && (
                                            <div className="bg-slate-900/60 border border-amber-400/20 p-2 rounded-2xl text-amber-300 shrink-0">
                                                {icon}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            {title && (
                                                <h2 className="text-lg font-bold text-white truncate">{title}</h2>
                                            )}
                                            {subtitle && (
                                                <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
                                            )}
                                        </div>
                                    </div>
                                    {!hideCloseButton && (
                                        <button
                                            onClick={onClose}
                                            className="bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700 p-2 rounded-xl shrink-0"
                                            aria-label="إغلاق"
                                        >
                                            <X className="w-4 h-4 text-slate-300" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3 overscroll-contain">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
