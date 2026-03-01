"use client";

import { useState } from "react";

export default function BuyCreditsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(packageKey: string) {
    try {
      setLoading(packageKey);

      const res = await fetch("/api/square/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageKey,
          buyerEmail: "user@email.com", // Replace with real user email from session
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert("Error creating checkout");
        console.error(data);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("Checkout error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Buy Credits</h1>

      <button onClick={() => handleCheckout("5_10")}>
        $5 for 10 Credits
      </button>

      <button onClick={() => handleCheckout("10_25")}>
        $10 for 25 Credits
      </button>

      <button onClick={() => handleCheckout("15_35")}>
        $15 for 35 Credits
      </button>

      <button onClick={() => handleCheckout("20_50")}>
        $20 for 50 Credits
      </button>

      {loading && <p>Redirecting to secure checkout...</p>}
    </main>
  );
}