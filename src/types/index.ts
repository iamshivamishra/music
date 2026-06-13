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
  duration: number; // seconds
  price: number; // INR
  audioUrl: string; // Cloudinary URL
  coverUrl?: string; // Cloudinary URL
  uploadedBy: string;
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