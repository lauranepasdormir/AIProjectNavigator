import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ProjectSubmission } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Calendar, User, Download, Lock, Users, Globe, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { generateMarkdown, downloadMarkdown, formatMarkdownToHtml } from "@/lib/markdown";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  // State for search, dialog, and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<ProjectSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<ProjectSubmission | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const { toast } = useToast();

  // Fetch project submissions
  const { data: projectSubmissions, isLoading, error } = useQuery({
    queryKey: ['/api/project-submissions'],
    refetchInterval: 30000 // Refetch every 30 seconds
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await apiRequest(`/api/project-submissions/${submissionId}`, 'DELETE');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project submission deleted successfully",
        variant: "default"
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/project-submissions'] });
      setIsDeleteDialogOpen(false);
      setSubmissionToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting submission:", error);
      toast({
        title: "Error",
        description: "Failed to delete project submission",
        variant: "destructive"
      });
    }
  });

  // Format date nicely
  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Get visibility badge color
  const getVisibilityColor = (visibility: string): "default" | "secondary" | "outline" | "destructive" => {
    switch(visibility.toLowerCase()) {
      case 'private':
        return 'secondary';
      case 'internal':
        return 'default';  
      case 'public':
        return 'destructive'; // Using destructive to represent 'public' - typically red/orange color
      default:
        return 'outline';
    }
  };

  // Filter submissions based on search query and visibility filter
  const filteredSubmissions = projectSubmissions && Array.isArray(projectSubmissions) 
    ? projectSubmissions.filter((submission: ProjectSubmission) => {
        // First filter by visibility if needed
        if (visibilityFilter !== 'all' && submission.visibility.toLowerCase() !== visibilityFilter.toLowerCase()) {
          return false;
        }
        
        // Then filter by search query
        if (!searchQuery) return true;
        
        const searchLower = searchQuery.toLowerCase();
        return (
          submission.title.toLowerCase().includes(searchLower) ||
          submission.username.toLowerCase().includes(searchLower) ||
          submission.description.toLowerCase().includes(searchLower) ||
          submission.status.toLowerCase().includes(searchLower)
        );
      })
    : [];

  // View submission details
  const handleViewSubmission = (submission: ProjectSubmission) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSubmission(null);
  };
  
  // Handle download markdown file
  const handleDownload = (submission: ProjectSubmission) => {
    // Prepare data in the expected format for generateMarkdown
    const markdownData = {
      username: submission.username,
      title: submission.title,
      description: submission.description,
      problem: submission.problem,
      technology: submission.technology,
      impact: submission.impact,
      team: submission.team,
      status: submission.status,
      contact: submission.contact
    };
    
    // Generate markdown and download
    const markdown = generateMarkdown(markdownData);
    const filename = `${submission.title.replace(/\s+/g, '-').toLowerCase()}.md`;
    downloadMarkdown(markdown, filename);
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (submission: ProjectSubmission) => {
    setSubmissionToDelete(submission);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle actual deletion
  const confirmDelete = () => {
    if (submissionToDelete) {
      deleteMutation.mutate(submissionToDelete.id);
    }
  };
  
  // Cancel deletion
  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSubmissionToDelete(null);
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-primary">Project Submissions</h1>
        
        {/* Search input */}
        <div className="relative w-full md:w-64">
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
      <div className="mb-6">
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold block mb-1">Failed to load submissions</strong>
          <span className="block sm:inline mb-2">There was a problem connecting to the database. Please try again or contact support.</span>
          <div className="mt-2 text-xs">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Force refetch
                queryClient.invalidateQueries({ queryKey: ['/api/project-submissions'] });
                toast({
                  title: "Retrying",
                  description: "Attempting to reload project submissions",
                  variant: "default"
                });
              }}
              className="mr-2"
            >
              Retry
            </Button>
          </div>
        </div>
      ) : filteredSubmissions?.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <div className="mb-2">No submissions found</div>
          {searchQuery && <div>Try adjusting your search</div>}
        </div>
      ) : (
        <Table>
          <TableCaption>A list of all project submissions.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions?.map((submission: ProjectSubmission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">
                  <div className="font-bold">{submission.title}</div>
                  <div className="text-sm text-gray-500 truncate max-w-md">
                    {submission.description.length > 100
                      ? `${submission.description.substring(0, 100)}...`
                      : submission.description}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={getVisibilityColor(submission.visibility)}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    {submission.visibility === 'private' && <Lock className="h-3.5 w-3.5" />}
                    {submission.visibility === 'internal' && <Users className="h-3.5 w-3.5" />}
                    {submission.visibility === 'public' && <Globe className="h-3.5 w-3.5" />}
                    {submission.visibility.charAt(0).toUpperCase() + submission.visibility.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      submission.status === "Completed" ? "default" :
                      submission.status === "In Progress" ? "secondary" :
                      "outline"
                    }
                  >
                    {submission.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    {submission.username}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    {formatDate(submission.createdAt)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(submission)}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleViewSubmission(submission)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteClick(submission)}
                      className="gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Submission Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedSubmission.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-3 pt-2">
                  <Badge variant="outline" className="text-sm">
                    By {selectedSubmission.username}
                  </Badge>
                  <Badge 
                    variant={getVisibilityColor(selectedSubmission.visibility)} 
                    className="text-sm flex items-center gap-1"
                  >
                    {selectedSubmission.visibility === 'private' && <Lock className="h-3.5 w-3.5" />}
                    {selectedSubmission.visibility === 'internal' && <Users className="h-3.5 w-3.5" />}
                    {selectedSubmission.visibility === 'public' && <Globe className="h-3.5 w-3.5" />}
                    {selectedSubmission.visibility.charAt(0).toUpperCase() + selectedSubmission.visibility.slice(1)}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Status: {selectedSubmission.status}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Submitted: {new Date(selectedSubmission.createdAt).toLocaleDateString()}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Description</h3>
                  <p className="text-gray-700">{selectedSubmission.description}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Problem Statement</h3>
                  <p className="text-gray-700">{selectedSubmission.problem}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Technology Stack</h3>
                  <p className="text-gray-700">{selectedSubmission.technology}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Impact</h3>
                  <p className="text-gray-700">{selectedSubmission.impact}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Team</h3>
                  <p className="text-gray-700">{selectedSubmission.team}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Contact</h3>
                  <p className="text-gray-700">{selectedSubmission.contact}</p>
                </div>
              </div>

              <div className="flex justify-between gap-2 mt-4">
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleCloseDialog();
                    handleDeleteClick(selectedSubmission);
                  }}
                  className="gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Submission
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handleDownload(selectedSubmission)}
                    className="gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Download Markdown
                  </Button>
                  <Button onClick={handleCloseDialog}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project submission
              "{submissionToDelete?.title}" from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Deleting...
                </div>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}