import React, { useState, useEffect, Suspense, lazy } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectSubmission } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateMarkdown, downloadMarkdown } from "@/lib/markdown";
import { queryClient, apiRequest } from "@/lib/queryClient";

import SearchFilterBar from "@/components/admin/SearchFilterBar";
import SubmissionTable from "@/components/admin/SubmissionTable";



import SetupPage from "@/pages/SetupPage";

// Lazy-load dialog components
const SubmissionDetailsDialog = React.lazy(() => import("@/components/admin/SubmissionDetailsDialog"));
const DeleteConfirmationDialog = React.lazy(() => import("@/components/admin/DeleteConfirmationDialog"));

export default function AdminPanel() {
  // State for search, dialog, and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<ProjectSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<ProjectSubmission | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const queryClientInstance = useQueryClient();

  // Check auth status
  const { data: authStatus, isLoading: isAuthLoading } = useQuery({
    queryKey: ['/api/me'],
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch submissions
  const {
    data: projectSubmissions,
    isLoading: isSubmissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ['/api/project-submissions-direct'],
    queryFn: async () => {
      try {
        // Attempt direct endpoint (bypassing auth)
        const directRes = await fetch('/api/project-submissions-direct', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (directRes.ok) {
          const data = await directRes.json();
          return data as ProjectSubmission[];
        }
        // Fallback to regular endpoint
        const regularRes = await fetch('/api/project-submissions', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (!regularRes.ok) {
          throw new Error(`API Error: ${regularRes.status} ${regularRes.statusText}`);
        }
        const regularData = await regularRes.json();
        return regularData as ProjectSubmission[];
      } catch (error) {
        throw error;
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/project-submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Delete failed: ${response.status}`);
      }
      return true;
    },
    onSuccess: () => {
      toast("Project submission deleted successfully", { 
        description: "Success", 
        style: { background: "#22c55e", color: "#fff" } 
      });
      queryClientInstance.invalidateQueries({ queryKey: ['/api/project-submissions-direct'] });
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    },
    onError: () => {
      toast("Failed to delete project submission", { 
        description: "Error", 
        style: { background: "#ef4444", color: "#fff" } 
      });
    }
  });

  const isLoading = isAuthLoading || isSubmissionsLoading;
  const error = submissionsError as Error | null;

  // Filter logic
  const filteredSubmissions = projectSubmissions && Array.isArray(projectSubmissions)
    ? projectSubmissions.filter((submission: ProjectSubmission) => {
        if (visibilityFilter !== 'all' && submission.visibility.toLowerCase() !== visibilityFilter.toLowerCase()) {
          return false;
        }
        if (!searchQuery) return true;
        const lower = searchQuery.toLowerCase();
        return (
          submission.title.toLowerCase().includes(lower) ||
          submission.description.toLowerCase().includes(lower)
        );
      })
    : [];

  // Handlers
  const handleViewSubmission = (submission: ProjectSubmission) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSubmission(null);
  };

  const handleDownload = (submission: ProjectSubmission) => {
    const markdownData = {
      title: submission.title,
      description: submission.description,
      problem: submission.problem,
      technology: submission.technology,
      impact: submission.impact,
      team: submission.team,
      status: submission.status,
      username: submission.username,
    };
    const markdown = generateMarkdown(markdownData);
    const filename = `${submission.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    downloadMarkdown(markdown, filename);
  };

  const handleDeleteClick = (submission: ProjectSubmission) => {
    setSubmissionToDelete(submission);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (submissionToDelete) {
      deleteMutation.mutate(submissionToDelete.id);
    }
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSubmissionToDelete(null);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-primary">Project Submissions</h1>
        <SearchFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          visibilityFilter={visibilityFilter}
          setVisibilityFilter={setVisibilityFilter}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">
            {error.message || "There was a problem connecting to the database."}
          </span>
          <div className="mt-2 text-sm bg-red-50 p-2 rounded border border-red-200">
            <p className="font-semibold">Error details:</p>
            <code className="text-xs block mt-1 overflow-auto max-h-24">
              {error.name}: {error.message}
            </code>
          </div>
          <div className="mt-2 flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetchSubmissions()}>
              Retry
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>
              Log in again
            </Button>
          </div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <div className="mb-2">No submissions found</div>
          {searchQuery && <div>Try adjusting your search</div>}
        </div>
      ) : (
        <SubmissionTable
          submissions={filteredSubmissions}
          onView={handleViewSubmission}
          onDelete={handleDeleteClick}
          onDownload={handleDownload}
        />
      )}

      {/* Lazy-loaded dialogs */}
      {selectedSubmission && (
        <Suspense fallback={<div>Loading...</div>}>
          <SubmissionDetailsDialog
            open={isDialogOpen}
            submission={selectedSubmission}
            onClose={handleCloseDialog}
            onDelete={handleDeleteClick}
            onDownload={handleDownload}
          />
        </Suspense>
      )}
      {submissionToDelete && (
        <Suspense fallback={<></>}>
          <DeleteConfirmationDialog
            open={isDeleteDialogOpen}
            submission={submissionToDelete}
            onCancel={cancelDelete}
            onConfirm={confirmDelete}
          />
        </Suspense>
      )}
    </div>
  );
}