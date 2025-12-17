"use client";

import { ReactNode } from "react";
import { Layout } from "./Layout";

export function ClientLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}
