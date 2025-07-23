import React, { useState, Suspense, lazy } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectSubmission } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateMarkdown, downloadMarkdown } from "@/lib/markdown";
import SubmissionTable from "@/components/admin/SubmissionTable";

// Lazy-loaded dialogs for performance optimization
const SubmissionDetailsDialog = lazy(() => import("@/components/admin/SubmissionDetailsDialog"));
const DeleteConfirmationDialog = lazy(() => import("@/components/admin/DeleteConfirmationDialog"));

export default function AdminPanel() {
  // UI and interaction state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<ProjectSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<ProjectSubmission | null>(null);
  const queryClientInstance = useQueryClient();

  // Check authentication status
  const { data: authStatus, isLoading: isAuthLoading } = useQuery({
    queryKey: ['/api/me'],
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch all submissions from API
  const {
    data: projectSubmissions,
    isLoading: isSubmissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ['/api/project-submissions-direct'],
    queryFn: async () => {
      try {
        const directRes = await fetch('/api/project-submissions-direct', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (directRes.ok) return await directRes.json();

        const fallbackRes = await fetch('/api/project-submissions', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (!fallbackRes.ok) throw new Error(`API Error: ${fallbackRes.status} ${fallbackRes.statusText}`);
        return await fallbackRes.json();
      } catch (error) {
        throw error;
      }
    },
  });

  // Handle delete submission
  const deleteMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const res = await fetch(`/api/project-submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text() || `Delete failed: ${res.status}`);
      return true;
    },
    onSuccess: () => {
      toast("Project submission deleted successfully", { description: "Success", style: { background: "#22c55e", color: "#fff" } });
      queryClientInstance.invalidateQueries({ queryKey: ['/api/project-submissions-direct'] });
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    },
    onError: () => {
      toast("Failed to delete project submission", { description: "Error", style: { background: "#ef4444", color: "#fff" } });
    }
  });

  const isLoading = isAuthLoading || isSubmissionsLoading;
  const error = submissionsError as Error | null;

  // Apply filter and search query
  const filteredSubmissions = projectSubmissions?.filter((submission: ProjectSubmission) => {
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return (
      submission.title.toLowerCase().includes(lower) ||
      submission.description.toLowerCase().includes(lower)
    );
  }) ?? [];

  // Open view dialog
  const handleViewSubmission = (submission: ProjectSubmission) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSubmission(null);
  };

  // Export markdown file
  const handleDownload = (submission: ProjectSubmission) => {
    const markdown = generateMarkdown(submission);
    const filename = `${submission.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    downloadMarkdown(markdown, filename);
  };

  // Trigger delete confirmation
  const handleDeleteClick = (submission: ProjectSubmission) => {
    setSubmissionToDelete(submission);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (submissionToDelete) deleteMutation.mutate(submissionToDelete.id);
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSubmissionToDelete(null);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-primary">Project Submissions</h1>
        {/* SearchFilterBar can be added here if needed */}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{error.message || "There was a problem connecting to the database."}</span>
          <div className="mt-2 text-sm bg-red-50 p-2 rounded border border-red-200">
            <p className="font-semibold">Error details:</p>
            <code className="text-xs block mt-1 overflow-auto max-h-24">{error.name}: {error.message}</code>
          </div>
          <div className="mt-2 flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetchSubmissions}>Retry</Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/login'}>Log in again</Button>
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

      {/* Detail view modal */}
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

      {/* Delete confirmation modal */}
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
