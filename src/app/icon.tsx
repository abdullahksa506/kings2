/*
 * 🤖 قال الروبوت: رتبت المجلس، بس اختيار المطعم ما زال على الملك 😂
 */
import { ImageResponse } from 'next/og';
import RoyalMark from '@/components/RoyalMark';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export default function Icon() {
    return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#0b101b',color:'#e8bd6d'}}><RoyalMark size={410} /></div>, size);
}
