"use client";

import { SmartAccountInfo } from "@/components/SmartAccountInfo";
import { SendUserOperation } from "@/components/SendUserOperation";

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Smart Account Management */}
        <SmartAccountInfo />

        {/* Right: Transaction Sender */}
        <SendUserOperation />
      </div>
    </div>
  );
}