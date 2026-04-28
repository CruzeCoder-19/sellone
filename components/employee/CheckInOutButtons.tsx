"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { checkIn, checkOut } from "@/server/actions/employee.actions";

type Props = {
  mode: "check-in" | "check-out";
};

export function CheckInOutButtons({ mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = mode === "check-in" ? await checkIn() : await checkOut();
    setLoading(false);

    if (result.ok) {
      toast.success(mode === "check-in" ? "Checked in successfully" : "Checked out successfully");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  if (mode === "check-in") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Checking in…" : "Check In"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
    >
      {loading ? "Checking out…" : "Check Out"}
    </button>
  );
}
