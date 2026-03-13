import CryptoJS from 'crypto-js';

const SECRET_KEY = 'scanrx-secure-verification-key-2026';

export const encryptMedicineId = (id: string): string => {
  return CryptoJS.AES.encrypt(id, SECRET_KEY).toString();
};

export const decryptMedicineId = (encrypted: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || null;
  } catch (e) {
    return null;
  }
};
