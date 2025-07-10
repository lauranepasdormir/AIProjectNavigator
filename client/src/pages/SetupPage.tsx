import React from "react";

export default function SetupPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-xl font-semibold mb-4">
        Initializing authentication…
      </div>
      <div className="animate-spin h-12 w-12 border-4 border-t-primary rounded-full"></div>
      <div className="mt-2 text-gray-500">Please wait a moment</div>
    </div>
  );
}
