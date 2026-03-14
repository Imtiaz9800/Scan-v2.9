import CryptoJS from 'crypto-js';

const SECRET_KEY = 'scanrx-v2-ultra-secure-pharmaceutical-key-9922';
const PREFIX = 'SRX_SEC_';

export const encryptMedicineId = (id: string): string => {
  const encrypted = CryptoJS.AES.encrypt(id, SECRET_KEY).toString();
  return `${PREFIX}${encrypted}`;
};

export const decryptMedicineId = (data: string): string | null => {
  try {
    if (!data.startsWith(PREFIX)) return null;
    const encrypted = data.substring(PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || null;
  } catch (e) {
    return null;
  }
};
