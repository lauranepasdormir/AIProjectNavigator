import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Calendar, User, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { generateMarkdown, downloadMarkdown, formatMarkdownToHtml } from "@/lib/markdown";

export default function AdminPanel() {
  // State for search and dialog
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<ProjectSubmission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch project submissions
  const { data: projectSubmissions, isLoading, error } = useQuery({
    queryKey: ['/api/project-submissions'],
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Format date nicely
  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Filter submissions based on search query
  const filteredSubmissions = projectSubmissions && Array.isArray(projectSubmissions) 
    ? projectSubmissions.filter((submission: ProjectSubmission) => {
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

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">Failed to load submissions. Please try again.</span>
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

              <div className="flex justify-end gap-2 mt-4">
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}