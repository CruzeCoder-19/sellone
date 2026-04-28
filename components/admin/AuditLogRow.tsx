"use client";

import { useState } from "react";

type Props = {
  log: {
    id: string;
    createdAt: Date;
    actor: { name: string | null; email: string | null } | null;
    action: string;
    entity: string;
    entityId: string;
    metadata: unknown;
  };
};

export function AuditLogRow({ log }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = log.metadata !== null && log.metadata !== undefined;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
        <td className="px-4 py-3">
          {log.actor ? (
            <span>{log.actor.name ?? log.actor.email ?? "—"}</span>
          ) : (
            <span className="italic text-gray-400">System</span>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-xs font-medium">{log.action}</td>
        <td className="px-4 py-3">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium">{log.entity}</span>
        </td>
        <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-gray-500">
          {log.entityId}
        </td>
        <td className="px-4 py-3">
          {hasMetadata && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasMetadata && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-4 py-3">
            <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-400">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
