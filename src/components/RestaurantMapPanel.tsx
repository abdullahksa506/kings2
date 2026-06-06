"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    X, MapPin, Star, Plus, Navigation, Pencil, Trash2, Search,
    Link2, Crosshair, Check, Loader2, MapPinned,
} from "lucide-react";
import {
    canonRestaurant,
    listenToRestaurantLocations,
    getRestaurantSummaries,
    setRestaurantLocation,
    deleteRestaurantLocation,
    parseMapLink,
    isShortMapLink,
    expandMapLink,
    geocodeSearch,
    buildGoogleMapsLink,
    RestaurantSummary,
    RestaurantLocation,
    GeocodeResult,
} from "@/lib/mapServices";

interface RestaurantMapPanelProps {
    isOpen: boolean;
    onClose?: () => void;
    userName: string;
    isAdmin: boolean;
    /** When true, render as an embedded tab (no fixed overlay) instead of a modal. */
    embedded?: boolean;
}

const RIYADH: [number, number] = [24.7136, 46.6753];

// Pin color by average rating.
function pinColor(avg: number): string {
    if (avg >= 4) return "#10b981"; // emerald
    if (avg >= 3) return "#f59e0b"; // amber
    if (avg > 0) return "#ef4444"; // red
    return "#64748b"; // slate (unrated)
}

function timeAgo(ms: number): string {
    if (!ms) return "—";
    const days = Math.floor((Date.now() - ms) / 86400000);
    if (days < 1) return "اليوم";
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months < 12) return `قبل ${months} شهر`;
    return `قبل ${Math.floor(months / 12)} سنة`;
}

type AddMethod = "map" | "link" | "search";

export default function RestaurantMapPanel({ isOpen, onClose, userName, isAdmin, embedded = false }: RestaurantMapPanelProps) {
    const [summaries, setSummaries] = useState<RestaurantSummary[]>([]);
    const [locations, setLocations] = useState<RestaurantLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string | null>(null); // canonical name
    const [addTarget, setAddTarget] = useState<string | null>(null); // restaurant being located
    const [pending, setPending] = useState<{ lat: number; lng: number } | null>(null);
    const [addMethod, setAddMethod] = useState<AddMethod>("link");
    const [linkInput, setLinkInput] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mapElRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const LRef = useRef<any>(null);
    const markerLayerRef = useRef<any>(null);
    const pendingMarkerRef = useRef<any>(null);

    // Location lookup keyed by canonical name.
    const locByName = useMemo(() => {
        const m = new Map<string, RestaurantLocation>();
        for (const l of locations) m.set(canonRestaurant(l.name), l);
        return m;
    }, [locations]);

    const located = useMemo(
        () => summaries.filter((s) => locByName.has(canonRestaurant(s.name))),
        [summaries, locByName],
    );
    const unlocated = useMemo(
        () => summaries.filter((s) => !locByName.has(canonRestaurant(s.name))),
        [summaries, locByName],
    );

    // --- Load data ---
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        getRestaurantSummaries()
            .then(setSummaries)
            .catch(() => setError("تعذّر تحميل المطاعم"))
            .finally(() => setLoading(false));
        const unsub = listenToRestaurantLocations(setLocations);
        return unsub;
    }, [isOpen]);

    // --- Map lifecycle (create on open / teardown on close) ---
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        (async () => {
            const L = (await import("leaflet")).default;
            if (cancelled || !mapElRef.current || mapRef.current) return;
            LRef.current = L;

            const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: true }).setView(
                RIYADH,
                11,
            );
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap",
            }).addTo(map);
            markerLayerRef.current = L.layerGroup().addTo(map);
            mapRef.current = map;

            // Settle tile size after the modal animates in.
            requestAnimationFrame(() => map.invalidateSize());
            setTimeout(() => map.invalidateSize(), 350);
        })();

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markerLayerRef.current = null;
            pendingMarkerRef.current = null;
        };
    }, [isOpen]);

    // Keep map sized to its container (mobile orientation changes).
    useEffect(() => {
        if (!isOpen || !mapElRef.current) return;
        const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
        ro.observe(mapElRef.current);
        return () => ro.disconnect();
    }, [isOpen]);

    // --- Render markers when data changes ---
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        const layer = markerLayerRef.current;
        if (!L || !map || !layer) return;

        layer.clearLayers();
        const pts: [number, number][] = [];

        for (const s of located) {
            const loc = locByName.get(canonRestaurant(s.name));
            if (!loc) continue;
            const color = pinColor(s.avgRating);
            const icon = L.divIcon({
                className: "",
                html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};color:#fff;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.4);border:2px solid #fff;"><span style="transform:rotate(45deg)">🍽️</span></div>`,
                iconSize: [34, 34],
                iconAnchor: [17, 34],
                popupAnchor: [0, -34],
            });
            const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(layer);
            const stars = s.avgRating > 0 ? `⭐ ${s.avgRating}` : "بدون تقييم";
            marker.bindPopup(
                `<div dir="rtl" style="text-align:right;font-family:inherit;min-width:140px">
                    <div style="font-weight:700;font-size:14px;margin-bottom:4px">${escapeHtml(s.name)}</div>
                    <div style="font-size:12px;color:#475569">${stars} · ${s.visitCount} زيارة</div>
                </div>`,
            );
            marker.on("click", () => setSelected(canonRestaurant(s.name)));
            pts.push([loc.lat, loc.lng]);
        }

        if (pts.length > 0 && !addTarget) {
            try {
                map.fitBounds(pts as any, { padding: [50, 50], maxZoom: 15 });
            } catch {
                /* ignore */
            }
        }
    }, [located, locByName, addTarget]);

    // --- Pending marker (while adding a location) ---
    useEffect(() => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        if (pendingMarkerRef.current) {
            map.removeLayer(pendingMarkerRef.current);
            pendingMarkerRef.current = null;
        }
        if (pending) {
            const icon = L.divIcon({
                className: "",
                html: `<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.4)"></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
            });
            pendingMarkerRef.current = L.marker([pending.lat, pending.lng], { icon }).addTo(map);
            map.setView([pending.lat, pending.lng], Math.max(map.getZoom(), 14));
        }
    }, [pending]);

    // --- Map click handler in "add" mode ---
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const handler = (e: any) => {
            if (addTarget && addMethod === "map") {
                setPending({ lat: e.latlng.lat, lng: e.latlng.lng });
                setError(null);
            }
        };
        map.on("click", handler);
        return () => map.off("click", handler);
    }, [addTarget, addMethod]);

    if (!isOpen) return null;

    const selectedSummary = selected ? located.find((s) => canonRestaurant(s.name) === selected) : null;
    const selectedLoc = selected ? locByName.get(selected) : null;

    const startAdd = (name: string) => {
        setAddTarget(name);
        setSelected(null);
        setPending(null);
        setLinkInput("");
        setSearchInput("");
        setSearchResults([]);
        setAddMethod("link");
        setError(null);
    };

    const cancelAdd = () => {
        setAddTarget(null);
        setPending(null);
        setError(null);
    };

    const handleExtractLink = async () => {
        setError(null);
        const direct = parseMapLink(linkInput);
        if (direct) {
            setPending(direct);
            return;
        }
        if (isShortMapLink(linkInput)) {
            setBusy(true);
            const expanded = await expandMapLink(linkInput.trim());
            setBusy(false);
            if (expanded) {
                setPending(expanded);
                return;
            }
            setError("تعذّر فك الرابط المختصر — جرّب نسخ الرابط الكامل أو ابحث بالاسم");
            return;
        }
        setError("ما قدرت أطلّع إحداثيات من الرابط — تأكد إنه رابط خرائط صحيح");
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const results = await geocodeSearch(searchInput.trim());
            setSearchResults(results);
            if (results.length === 0) setError("ما فيه نتائج — جرّب اسم أوضح أو الصق رابط");
        } catch {
            setError("تعذّر البحث");
        } finally {
            setBusy(false);
        }
    };

    const handleConfirmAdd = async () => {
        if (!addTarget || !pending) return;
        setBusy(true);
        setError(null);
        try {
            await setRestaurantLocation({
                name: addTarget,
                lat: pending.lat,
                lng: pending.lng,
                mapsUrl: buildGoogleMapsLink(pending.lat, pending.lng),
            });
            cancelAdd();
        } catch (e: any) {
            setError(e?.message || "تعذّر الحفظ");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm("تأكيد حذف موقع هذا المطعم؟")) return;
        setBusy(true);
        try {
            await deleteRestaurantLocation(name);
            setSelected(null);
        } catch (e: any) {
            setError(e?.message || "تعذّر الحذف");
        } finally {
            setBusy(false);
        }
    };

    // Embedded (tab) mode reserves room for the bottom tab bar; modal mode covers the screen.
    const rootClasses = embedded
        ? "fixed inset-0 z-30 bg-slate-950 flex flex-col pb-16"
        : "fixed inset-0 z-50 bg-slate-950 flex flex-col animate-[slideUp_0.3s_ease-out]";

    return (
        <div className={rootClasses} dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-emerald-500/30 to-teal-600/30 p-2.5 rounded-2xl border border-emerald-500/30">
                        <MapPinned className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-white">خريطة المطاعم</h2>
                        <p className="text-[11px] text-slate-500">
                            {located.length} مموقع · {unlocated.length} بدون موقع
                        </p>
                    </div>
                </div>
                {!embedded && onClose && (
                    <button
                        onClick={onClose}
                        className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 p-2 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Map */}
            <div className="relative flex-1 min-h-0">
                <div ref={mapElRef} className="absolute inset-0 z-0" />

                {/* Add-mode instruction bar */}
                {addTarget && (
                    <div className="absolute top-3 inset-x-3 z-[1000] bg-slate-900/95 border border-emerald-500/40 rounded-2xl p-3 shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-emerald-300">📍 تحديد موقع: {addTarget}</span>
                            <button onClick={cancelAdd} className="text-slate-400 text-xs underline">
                                إلغاء
                            </button>
                        </div>

                        {/* Method tabs */}
                        <div className="flex gap-1 mb-2 bg-slate-800/60 rounded-xl p-1">
                            {([
                                ["link", "رابط", Link2],
                                ["map", "الخريطة", Crosshair],
                                ["search", "بحث", Search],
                            ] as [AddMethod, string, any][]).map(([m, label, Icon]) => (
                                <button
                                    key={m}
                                    onClick={() => { setAddMethod(m); setError(null); }}
                                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                        addMethod === m ? "bg-emerald-500 text-slate-950" : "text-slate-300"
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" /> {label}
                                </button>
                            ))}
                        </div>

                        {addMethod === "link" && (
                            <div className="flex gap-2">
                                <input
                                    value={linkInput}
                                    onChange={(e) => setLinkInput(e.target.value)}
                                    placeholder="الصق رابط خرائط قوقل/آبل أو إحداثيات"
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                />
                                <button
                                    onClick={handleExtractLink}
                                    disabled={busy || !linkInput.trim()}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-3 rounded-lg text-sm"
                                >
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "استخرج"}
                                </button>
                            </div>
                        )}

                        {addMethod === "map" && (
                            <p className="text-xs text-slate-400 text-center py-1">اضغط على الخريطة لتحديد موقع المطعم 👇</p>
                        )}

                        {addMethod === "search" && (
                            <div>
                                <div className="flex gap-2">
                                    <input
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                        placeholder="ابحث باسم المطعم أو المكان"
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={busy || !searchInput.trim()}
                                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-3 rounded-lg text-sm"
                                    >
                                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                                    </button>
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                        {searchResults.map((r, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setPending({ lat: r.lat, lng: r.lng }); setSearchResults([]); }}
                                                className="w-full text-right bg-slate-800/60 hover:bg-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200"
                                            >
                                                {r.address}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}

                        {pending && (
                            <button
                                onClick={handleConfirmAdd}
                                disabled={busy}
                                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                            >
                                <Check className="w-4 h-4" /> تأكيد الموقع
                            </button>
                        )}
                    </div>
                )}

                {/* Selected restaurant card */}
                {selectedSummary && selectedLoc && !addTarget && (
                    <div className="absolute bottom-3 inset-x-3 z-[1000] bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-xl">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="font-bold text-white text-lg">{selectedSummary.name}</h3>
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                    <span className="flex items-center gap-0.5 text-amber-400">
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        {selectedSummary.avgRating > 0 ? selectedSummary.avgRating : "—"}
                                    </span>
                                    <span>· {selectedSummary.visitCount} زيارة</span>
                                    <span>· آخر زيارة {timeAgo(selectedSummary.lastVisitMs)}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <a
                                href={selectedLoc.mapsUrl || buildGoogleMapsLink(selectedLoc.lat, selectedLoc.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                            >
                                <Navigation className="w-4 h-4" /> خرائط قوقل
                            </a>
                            <button
                                onClick={() => startAdd(selectedSummary.name)}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg text-sm flex items-center gap-1"
                            >
                                <Pencil className="w-4 h-4" /> تعديل
                            </button>
                            {(selectedLoc.addedBy === userName || isAdmin) && (
                                <button
                                    onClick={() => handleDelete(selectedSummary.name)}
                                    className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-3 rounded-lg text-sm flex items-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom list */}
            {!addTarget && (
                <div className="max-h-[38vh] overflow-y-auto border-t border-slate-800 bg-slate-950">
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> جاري التحميل...
                        </div>
                    ) : (
                        <div className="p-3 space-y-3">
                            {unlocated.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-amber-400/80 mb-2 px-1">
                                        🆕 بدون موقع ({unlocated.length}) — ثبّتها على الخريطة
                                    </h4>
                                    <div className="space-y-1.5">
                                        {unlocated.map((s) => (
                                            <div
                                                key={s.name}
                                                className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {s.visitCount} زيارة · {s.avgRating > 0 ? `⭐ ${s.avgRating}` : "بدون تقييم"}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => startAdd(s.name)}
                                                    className="bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> أضف موقع
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {located.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-400/80 mb-2 px-1">
                                        ✅ على الخريطة ({located.length})
                                    </h4>
                                    <div className="space-y-1.5">
                                        {located.map((s) => (
                                            <button
                                                key={s.name}
                                                onClick={() => {
                                                    const loc = locByName.get(canonRestaurant(s.name));
                                                    setSelected(canonRestaurant(s.name));
                                                    if (loc && mapRef.current) {
                                                        mapRef.current.setView([loc.lat, loc.lng], 15);
                                                    }
                                                }}
                                                className="w-full text-right flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-xl px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                                                    <p className="text-[11px] text-slate-500">
                                                        {s.visitCount} زيارة · {s.avgRating > 0 ? `⭐ ${s.avgRating}` : "بدون تقييم"}
                                                    </p>
                                                </div>
                                                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {summaries.length === 0 && (
                                <p className="text-center text-slate-500 text-sm py-8">
                                    ما فيه مطاعم مسجّلة بعد. تظهر هنا بعد ما تكملون طلعات.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
