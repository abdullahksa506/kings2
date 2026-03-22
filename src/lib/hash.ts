export async function hashPassword(password: string): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error("تأكد من استخدام التصفح الآمن (HTTPS) لأن التشفير غير مدعوم في هذا المتصفح.");
    }
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

export function isHashed(password: string): boolean {
    return password.length === 64 && /^[a-f0-9]+$/i.test(password);
}
