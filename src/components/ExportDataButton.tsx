"use client";

import { useState } from "react";
import { services } from "@/lib/services";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

export default function ExportDataButton() {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            // 1. Fetch completed weeks
            const completedWeeks = await services.getAllCompletedWeeks();

            const mainRatingsRows: any[] = [];
            const bathroomRatingsRows: any[] = [];

            // 2. Aggregate data
            for (const { week, averageScore } of completedWeeks) {
                const dateHeader = week.createdAt ? new Date(week.createdAt.toMillis()).toLocaleDateString("ar-SA") : "غير معروف";

                // Fetch Main Ratings
                const ratings = await services.getAllRatingsForWeek(week.id);
                if (ratings.length > 0) {
                    ratings.forEach(r => {
                        mainRatingsRows.push({
                            "رقم الدورة": week.cycleNumber,
                            "التاريخ": dateHeader,
                            "اسم المطعم": week.restaurant || "غير محدد",
                            "الملك": week.king || "غير محدد",
                            "النشاط": week.activity || "لا يوجد",
                            "متوسط تقييم المطعم": averageScore.toFixed(2),
                            "اسم المصوت": r.userName,
                            "تقييم المصوت": r.score
                        });
                    });
                } else {
                    // Include week even if no ratings
                    mainRatingsRows.push({
                        "رقم الدورة": week.cycleNumber,
                        "التاريخ": dateHeader,
                        "اسم المطعم": week.restaurant || "غير محدد",
                        "الملك": week.king || "غير محدد",
                        "النشاط": week.activity || "لا يوجد",
                        "متوسط تقييم المطعم": averageScore.toFixed(2),
                        "اسم المصوت": "-",
                        "تقييم المصوت": "-"
                    });
                }

                // Fetch Bathroom Ratings
                const bRatings = await services.getBathroomRatingsForWeek(week.id);
                if (bRatings.length > 0) {
                    const bAverage = bRatings.reduce((sum, r) => sum + r.score, 0) / bRatings.length;
                    bRatings.forEach(r => {
                        bathroomRatingsRows.push({
                            "رقم الدورة": week.cycleNumber,
                            "التاريخ": dateHeader,
                            "اسم المطعم": week.restaurant || "غير محدد",
                            "متوسط تقييم الحمامات": bAverage.toFixed(2),
                            "اسم المصوت": r.userName,
                            "تقييم المصوت": r.score
                        });
                    });
                }
            }

            // 3. Create Workbook
            const wb = XLSX.utils.book_new();

            // Main Ratings Sheet
            const wsMain = XLSX.utils.json_to_sheet(mainRatingsRows);
            XLSX.utils.book_append_sheet(wb, wsMain, "تقييم المطاعم");

            // Bathroom Ratings Sheet
            if (bathroomRatingsRows.length > 0) {
                const wsBathroom = XLSX.utils.json_to_sheet(bathroomRatingsRows);
                XLSX.utils.book_append_sheet(wb, wsBathroom, "تقييم الحمامات");
            }

            // Set RTL (Right-to-Left) direction for sheets if supported by viewer
            wsMain['!dir'] = 'rtl';

            // 4. Download file
            XLSX.writeFile(wb, "Kings_Of_Thursday_Data.xlsx");

        } catch (err) {
            console.error("Error exporting data:", err);
            alert("حدث خطأ أثناء استخراج البيانات!");
        }
        setExporting(false);
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
        >
            <Download className="w-5 h-5" />
            {exporting ? "جاري تجهيز الملف..." : "تصدير جميع البيانات (Excel)"}
        </button>
    );
}
