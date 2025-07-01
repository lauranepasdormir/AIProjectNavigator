import React from 'react';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Lock, Users, Globe } from "lucide-react";

interface SearchFilterBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  visibilityFilter: string;
  setVisibilityFilter: (value: string) => void;
}

export default function SearchFilterBar({
  searchQuery,
  setSearchQuery,
  visibilityFilter,
  setVisibilityFilter,
}: SearchFilterBarProps) {
  return (
    <div className="w-full md:flex md:items-center md:justify-between md:gap-4">
      {/* Search input */}
      <div className="flex-1 md:w-64 mb-4 md:mb-0">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            className="pl-9 w-full"
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Visibility filter tabs */}
      <div className="md:flex-1">
        <Tabs
          defaultValue="all"
          value={visibilityFilter}
          onValueChange={setVisibilityFilter}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="all" className="flex items-center gap-1">
              All
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-1">
              <Lock className="h-4 w-4" />
              Private
            </TabsTrigger>
            <TabsTrigger value="internal" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Internal
            </TabsTrigger>
            <TabsTrigger value="public" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Public
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
