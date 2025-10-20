import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";

export const metadata = {
  title: "Monad Boost - Smart Account Wallet",
  description: "Experience the power of Account Abstraction on Monad & Sepolia. Token faucets, smart accounts, and gasless transactions.",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col text-gray-800" style={{ backgroundColor: '#FAFAFA', fontFamily: "'Inter', 'Helvetica Now', 'Roboto', sans-serif" }} suppressHydrationWarning={true}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow py-12">
              <div className="max-w-[80%] mx-auto px-8">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
