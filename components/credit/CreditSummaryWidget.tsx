"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatPaise } from "@/lib/format";

type CreditAccountSummary = {
  id: string;
  status: string;
  limitInPaise: number;
  outstandingInPaise: number;
  availableInPaise: number;
};

type ApiResponse = { account: CreditAccountSummary | null };

function progressColor(outstanding: number, limit: number) {
  if (limit === 0) return "bg-gray-300";
  const pct = outstanding / limit;
  if (pct > 0.8) return "bg-red-500";
  if (pct > 0.5) return "bg-yellow-400";
  return "bg-green-500";
}

export function CreditSummaryWidget() {
  const { data, isPending, isError } = useQuery<ApiResponse>({
    queryKey: ["credit-summary"],
    queryFn: () => fetch("/api/credit/summary").then((r) => r.json()),
  });

  const cardBase =
    "rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3";

  if (isPending) {
    return (
      <div className={cardBase}>
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cardBase}>
        <p className="text-sm text-gray-500">Failed to load credit info.</p>
      </div>
    );
  }

  const account = data?.account;

  // No account or NONE status — invite to apply
  if (!account || account.status === "NONE") {
    return (
      <div className={cardBase}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Wolsell Credit
        </p>
        <p className="text-sm text-gray-600">
          Get a revolving credit limit to buy now and pay later.
        </p>
        <Link
          href="/customer/credit/apply"
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Apply for Wolsell Credit →
        </Link>
      </div>
    );
  }

  // PENDING
  if (account.status === "PENDING") {
    return (
      <div className={`${cardBase} border-blue-200 bg-blue-50`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Wolsell Credit
        </p>
        <p className="text-sm text-blue-700">Your application is under review.</p>
        <Link
          href="/customer/credit"
          className="inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          View Application →
        </Link>
      </div>
    );
  }

  // SUSPENDED
  if (account.status === "SUSPENDED") {
    return (
      <div className={`${cardBase} border-orange-200 bg-orange-50`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
          Wolsell Credit
        </p>
        <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
          Suspended
        </span>
        <p className="text-sm text-orange-700">
          Outstanding:{" "}
          <span className="font-semibold">
            {formatPaise(account.outstandingInPaise)}
          </span>
        </p>
        <p className="text-xs text-orange-600">Contact support to reinstate.</p>
      </div>
    );
  }

  // APPROVED
  const usedPct =
    account.limitInPaise > 0
      ? Math.min(100, (account.outstandingInPaise / account.limitInPaise) * 100)
      : 0;

  return (
    <div className={cardBase}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Wolsell Credit
        </p>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-400">Limit</p>
          <p className="text-sm font-semibold">{formatPaise(account.limitInPaise)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Used</p>
          <p className="text-sm font-semibold text-orange-600">
            {formatPaise(account.outstandingInPaise)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Free</p>
          <p className="text-sm font-semibold text-green-600">
            {formatPaise(account.availableInPaise)}
          </p>
        </div>
      </div>

      {/* Mini progress bar */}
      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${progressColor(account.outstandingInPaise, account.limitInPaise)}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="mt-0.5 text-right text-xs text-gray-400">
          {usedPct.toFixed(0)}% used
        </p>
      </div>

      <Link
        href="/customer/credit"
        className="inline-block text-sm font-medium text-blue-600 hover:underline"
      >
        View Details →
      </Link>
    </div>
  );
}
