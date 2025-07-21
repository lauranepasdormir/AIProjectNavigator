import React from 'react';
import { ProjectSubmission } from "@shared/schema";
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

// Props for DeleteConfirmationDialog
interface DeleteConfirmationDialogProps {
  open: boolean;                            // Controls whether the dialog is open
  submission: ProjectSubmission | null;     // The submission to delete (null-safe)
  onCancel: () => void;                     // Callback when the user cancels
  onConfirm: () => void;                    // Callback when the user confirms deletion
}

// A dialog prompting the user to confirm deletion of a project submission
export default function DeleteConfirmationDialog({
  open,
  submission,
  onCancel,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this submission?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the project submission "{submission?.title}" from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Yes, delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
