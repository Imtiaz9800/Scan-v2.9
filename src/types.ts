export type UserRole = 'public' | 'manufacturer' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: any;
}

export interface Medicine {
  id: string;
  name: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  manufacturerUid: string;
  createdAt: any;
}

export interface Article {
  id: string;
  title: string;
  content: string;
  authorUid: string;
  medicineId?: string;
  imageUrl?: string;
  videoUrl?: string;
  status: 'private' | 'public';
  createdAt: any;
}

export interface ScanRecord {
  id: string;
  medicineId: string;
  scannedAt: any;
  isAuthentic: boolean;
}
