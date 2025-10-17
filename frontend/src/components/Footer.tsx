"use client";

export default function Footer() {
  return (
    <footer className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 text-white py-6 px-8 mt-8">
      <div className="max-w-[80%] mx-auto">
        <div className="flex items-center justify-center">
          {/* Copyright */}
          <p className="text-gray-500 text-xs">
            © 2025 Monad Boost. Built with Account Abstraction.
          </p>
        </div>
      </div>
    </footer>
  );
}
