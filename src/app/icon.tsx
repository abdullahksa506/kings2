import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#020617', // slate-950
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="340" height="340">
                    <g transform="translate(106, 140) scale(1.2)">
                        <path d="M 40 180 L 210 180 C 220 180 220 195 210 195 L 40 195 C 30 195 30 180 40 180 Z" fill="#f59e0b" />
                        <path d="M 35 170 L 20 60 C 18 50 30 45 38 52 L 95 120 L 70 170 Z" fill="#f59e0b" />
                        <circle cx="20" cy="50" r="12" fill="#f59e0b" />
                        <path d="M 90 170 L 125 30 C 128 20 142 20 145 30 L 180 170 Z" fill="#f59e0b" />
                        <circle cx="135" cy="20" r="14" fill="#f59e0b" />
                        <path d="M 180 120 L 232 52 C 240 45 252 50 250 60 L 235 170 L 195 170 Z" fill="#f59e0b" />
                        <circle cx="250" cy="50" r="12" fill="#f59e0b" />
                    </g>
                </svg>
            </div>
        ),
        { ...size }
    );
}
