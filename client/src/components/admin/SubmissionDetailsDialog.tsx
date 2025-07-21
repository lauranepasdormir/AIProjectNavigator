import React from "react";
import { ProjectSubmission } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Lock, Users, Globe } from "lucide-react";

// Props for the SubmissionDetailsDialog component
interface SubmissionDetailsDialogProps {
  open: boolean;                                      // Whether the dialog is open
  submission: ProjectSubmission | null;               // Selected submission data
  onClose: () => void;                                // Callback when dialog is closed
  onDelete: (submission: ProjectSubmission) => void;  // Callback for delete action
  onDownload: (submission: ProjectSubmission) => void;// Callback for download action
}

export default function SubmissionDetailsDialog({
  open,
  submission,
  onClose,
  onDelete,
  onDownload,
}: SubmissionDetailsDialogProps) {
  // If no submission is selected, render nothing
  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <>
          {/* Header section with title and badges */}
          <DialogHeader>
            <DialogTitle className="text-2xl">{submission.title}</DialogTitle>
            <DialogDescription className="flex flex-wrap gap-3 pt-2">
              <Badge variant="outline" className="text-sm">
                By {submission.username}
              </Badge>
              <Badge variant="outline" className="text-sm capitalize">
                Status: {submission.status}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Submitted: {new Date(submission.createdAt).toLocaleDateString()}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {/* Main content details */}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Description</h3>
              <p className="text-gray-700">{submission.description}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Problem Statement</h3>
              <p className="text-gray-700">{submission.problem}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Technology Stack</h3>
              <p className="text-gray-700">{submission.technology}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Impact</h3>
              <p className="text-gray-700">{submission.impact}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Team</h3>
              <p className="text-gray-700">{submission.team}</p>
            </div>
          </div>

          {/* Footer with actions */}
          <div className="flex justify-between gap-2 mt-4">
            {/* Delete button */}
            <Button
              variant="destructive"
              onClick={() => {
                onClose();
                onDelete(submission);
              }}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Submission
            </Button>

            {/* Download and close buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onDownload(submission)}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </Button>
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
