/*
 * 🤖 قال الروبوت: رتبت المجلس، بس اختيار المطعم ما زال على الملك 😂
 */
export default function RoyalMark({ className = "", size = 48 }: { className?: string; size?: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
        <path d="M18 33 35 47 50 22 65 47 82 33 74 70H26Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
        <path d="M29 81H71M50 47V62" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="15" r="4" fill="currentColor" /><circle cx="15" cy="27" r="3" fill="currentColor" /><circle cx="85" cy="27" r="3" fill="currentColor" />
    </svg>;
}
