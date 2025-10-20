"use client";
import { useEffect, useState, useCallback } from "react";
import { TokenAddresses } from "@/abi/contracts";

interface EventData {
  id: string;
  type: string;
  user?: string;
  token?: string;
  to?: string;
  amount?: string;
  smartAccount?: string;
  timestamp: string;
}

export default function AppHubEvents() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 5;

  // ✅ Envio GraphQL endpoint
  const ENVIO_GRAPHQL = "https://indexer.dev.hyperindex.xyz/a4728f5/v1/graphql";

  // ========== Helper functions ==========
  // Helper function to get token symbol from address
  const getTokenSymbol = (tokenAddress: string) => {
    // Search through all chains and tokens
    for (const chainId in TokenAddresses) {
      const chain = TokenAddresses[chainId as keyof typeof TokenAddresses];
      for (const tokenSymbol in chain.tokens) {
        const token = chain.tokens[tokenSymbol as keyof typeof chain.tokens];
        if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
          return token.symbol;
        }
      }
    }
    return "TOKEN";
  };

  const formatTokenAmount = (amount: string) => {
    const num = Number(amount);
    if (isNaN(num)) return amount;
    if (num >= 1e18) return (num / 1e18).toFixed(2) + " tokens";
    if (num >= 1e15) return (num / 1e15).toFixed(2) + " mTokens";
    if (num >= 1e12) return (num / 1e12).toFixed(2) + " μTokens";
    return num.toString();
  };

  const getExplorerUrl = (address: string) =>
    `https://testnet.monadexplorer.com/address/${address}`;

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}…${address.slice(-4)}`;

  // Pagination
  const totalPages = Math.ceil(events.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = events.slice(startIndex, endIndex);

  const goToPage = (page: number) => setCurrentPage(page);

  // ========== GraphQL Query ==========
  const simpleQuery = `
  query {
    AppHub_FaucetClaimed(limit: 5, order_by: { timestamp: desc }) {
      user
      token
      amount
      timestamp
    }
    AppHub_AccountDeployed(limit: 5, order_by: { timestamp: desc }) {
      user
      smartAccount
      timestamp
    }
    AppHub_FaucetTokenAdded(limit: 5, order_by: { amount: desc }) {
      token
      amount
    }
    AppHub_TransferExecuted(limit: 5, order_by: { timestamp: desc }) {
      user
      token
      to
      amount
      timestamp
    }
  }`;

  // ========== Fetch Data ==========
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(ENVIO_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: simpleQuery }),
      });
      const response = await res.json();

      if (response.errors) {
        console.error("GraphQL Errors:", response.errors);
        return;
      }

      const data = response.data;
      if (!data) return console.error("No data found");

      const merged: EventData[] = [];

      const pushEvents = (list: unknown[], type: string) => {
        if (list && Array.isArray(list)) {
          list.forEach((e, index) => {
            const eventData = e as Record<string, unknown>;
            merged.push({ 
              id: `${type}-${index}`, 
              type,
              timestamp: eventData.timestamp as string || "0",
              user: eventData.user as string,
              token: eventData.token as string,
              to: eventData.to as string,
              amount: eventData.amount as string,
              smartAccount: eventData.smartAccount as string
            });
          });
        }
      };

      pushEvents(data.AppHub_FaucetClaimed || [], "FaucetClaimed");
      pushEvents(data.AppHub_AccountDeployed || [], "AccountDeployed");
      pushEvents(data.AppHub_FaucetTokenAdded || [], "FaucetTokenAdded");
      pushEvents(data.AppHub_TransferExecuted || [], "TransferExecuted");

      merged.sort(
        (a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)
      );

      setEvents(merged);
      setCurrentPage(1);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Envio fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [simpleQuery]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ========== Render ==========
  if (loading)
    return (
      <div className="p-6 rounded-lg border border-gray-700" style={{ backgroundColor: '#1B282F' }}>
        <p className="text-gray-600">Loading AppHub events...</p>
      </div>
    );

  return (
    <div className="p-6 rounded-lg border border-gray-700" style={{ backgroundColor: '#1B282F' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">AppHub Event Tracker</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3 py-1 text-xs bg-[#FF6A00] hover:bg-[#E55A00] rounded-lg transition-colors text-white"
          >
            🔄 Refresh
          </button>
          <span className="text-xs text-gray-500">
            Last: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <p style={{ color: '#364153' }}>No events yet</p>
      ) : (
        <>
          <ul className="space-y-3">
            {currentEvents.map((e) => (
              <li
                key={e.id}
                className="p-3 border border-gray-700 rounded-lg" style={{ backgroundColor: '#364153' }}
              >
                <p className="font-semibold text-white">{e.type}</p>

                {e.type === "FaucetTokenAdded" && (
                  <p className="text-sm text-white">
                    💧 Faucet token added:{" "}
                    <a
                      href={getExplorerUrl(e.token!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.token!)}
                    </a>{" "}
                    ({getTokenSymbol(e.token!)}) | amount {formatTokenAmount(e.amount || "0")}
                  </p>
                )}

                {e.type === "FaucetClaimed" && (
                  <p className="text-sm text-white">
                    💰{" "}
                    <a
                      href={getExplorerUrl(e.user!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.user!)}
                    </a>{" "}
                    claimed {formatTokenAmount(e.amount || "0")} {getTokenSymbol(e.token!)} from{" "}
                    <a
                      href={getExplorerUrl(e.token!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.token!)}
                    </a>
                  </p>
                )}

                {e.type === "TransferExecuted" && (
                  <p className="text-sm text-white">
                    🔁{" "}
                    <a
                      href={getExplorerUrl(e.user!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.user!)}
                    </a>{" "}
                    sent {formatTokenAmount(e.amount || "0")} {getTokenSymbol(e.token!)} to{" "}
                    <a
                      href={getExplorerUrl(e.to!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.to!)}
                    </a>
                  </p>
                )}

                {e.type === "AccountDeployed" && (
                  <p className="text-sm text-white">
                    ⚙️ Account{" "}
                    <a
                      href={getExplorerUrl(e.smartAccount!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.smartAccount!)}
                    </a>{" "}
                    deployed by{" "}
                    <a
                      href={getExplorerUrl(e.user!)}
                      target="_blank"
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {formatAddress(e.user!)}
                    </a>
                  </p>
                )}

                <p className="text-xs text-gray-500">
                  ⏱ {e.timestamp ? new Date(Number(e.timestamp) * 1000).toLocaleString() : 'No timestamp'}
                </p>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors text-gray-700"
              >
                ← Previous
              </button>
              <span className="text-sm" style={{ color: '#364153' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-colors text-gray-700"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
