import React from "react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-4 px-6 mt-auto bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <img 
            src="/dv-logo.jpg" 
            alt="Digital Village Logo" 
            className="h-8 mr-3"
            onError={(e) => { console.error("Image failed to load:", e); }}
          />
        </div>
        <div className="text-sm text-gray-500">
          © {currentYear} Digital Village Pty Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
}