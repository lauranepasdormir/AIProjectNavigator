import React from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-4 px-6 bg-gray-50 border-t border-gray-200 fixed bottom-0 left-0 right-0 w-full z-10">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <img 
            src="/dv-logo.png" 
            alt="Digital Village Logo" 
            className="h-8 mr-3"
            onError={(e) => { console.error("Image failed to load:", e); }}
          />
          <span className="font-semibold text-blue-600">Digital Village</span>
        </div>
        <div className="text-sm text-gray-500">
          © {currentYear} Digital Village Pty Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}