export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  createdAt: Date;
}

export interface ISong {
  _id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  price: number;
  audioUrl: string;
  coverUrl?: string;
  uploadedBy: string;
  playlistId?: string; // 👈 naya field
  createdAt: Date;
}

export interface IPlaylist {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  createdBy: string;
  createdAt: Date;
}

export interface IPurchase {
  _id: string;
  userId: string;
  songId: string;
  orderId: string; // Razorpay order ID
  paymentId: string; // Razorpay payment ID
  amount: number;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
}