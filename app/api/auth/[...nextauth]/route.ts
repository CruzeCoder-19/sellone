export const runtime = "nodejs"; // CRITICAL — must never be "edge"

import { handlers } from "@/auth";
export const { GET, POST } = handlers;
