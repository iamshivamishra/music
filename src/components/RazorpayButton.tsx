"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RazorpayButtonProps {
  songId: string;
  songTitle: string;
  price: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RazorpayButton({
  songId,
  songTitle,
  price,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);

    try {
      const loaded = await loadRazorpay();

      if (!loaded) {
        alert("Razorpay load nahi hua. Internet check karo.");
        return;
      }

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ songId }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        alert(orderData.error || "Order create nahi hua");
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: price * 100,
        currency: "INR",
        name: "Trishul Beats",
        description: `Song: ${songTitle}`,
        order_id: orderData.orderId,

        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/payment/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              songId,
            }),
          });

          const verifyData = await verifyRes.json();

          if (verifyRes.ok) {
            alert("🎵 Payment successful! Song unlock ho gaya!");
            router.refresh();
          } else {
            alert(verifyData.error || "Payment verify nahi hua");
          }
        },

        prefill: {
          name: "",
          email: "",
        },

        theme: {
          color: "#7c5cfc",
        },

        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment mein problem aayi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handlePayment}
        disabled={loading}
        className="buyBtn"
      >
        {loading
          ? "Processing..."
          : `₹${price} mein khareedein 🎵`}
      </button>

      <style jsx>{`
        .buyBtn {
          width: 100%;
          padding: 14px 24px;
          border-radius: 12px;
          background: var(--primary);
          color: white;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }

        .buyBtn:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: scale(1.02);
        }

        .buyBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .buyBtn {
            padding: 12px 18px;
            font-size: 0.95rem;
          }
        }
      `}</style>
    </>
  );
}