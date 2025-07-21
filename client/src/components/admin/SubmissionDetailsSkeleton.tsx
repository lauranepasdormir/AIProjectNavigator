import React from "react";

// Skeleton loader component shown while submission details are loading
export default function SubmissionDetailsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-pulse">
      {/* Title placeholder */}
      <div className="h-8 bg-gray-300 rounded w-1/2" />

      {/* Badges placeholder row */}
      <div className="flex space-x-2">
        <div className="h-6 bg-gray-300 rounded-full w-20" />
        <div className="h-6 bg-gray-300 rounded-full w-24" />
        <div className="h-6 bg-gray-300 rounded-full w-28" />
      </div>

      {/* Section placeholders for description, problem, etc. */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            {/* Section title line */}
            <div className="h-4 bg-gray-300 rounded w-1/3" />
            {/* Section content lines */}
            <div className="h-3 bg-gray-300 rounded w-full" />
            <div className="h-3 bg-gray-300 rounded w-5/6" />
          </div>
        ))}
      </div>

      {/* Action buttons (delete, download, close) placeholders */}
      <div className="flex justify-between space-x-4">
        <div className="h-10 bg-gray-300 rounded flex-1" />
        <div className="h-10 bg-gray-300 rounded w-24" />
        <div className="h-10 bg-gray-300 rounded w-24" />
      </div>
    </div>
  );
}
