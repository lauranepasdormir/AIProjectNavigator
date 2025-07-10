interface ProjectData {
  username?: string;
  title?: string;
  description?: string;
  problem?: string;
  technology?: string;
  impact?: string;
  team?: string;
  status?: string;
  visibility?: string;
}

export function generateMarkdown(data: ProjectData): string {
  let markdown = `# ${data.title || 'Untitled Project'}\n\n`;
  
  if (data.username) {
    markdown += `## Submitted by\n${data.username}\n\n`;
  }
  
  if (data.description) {
    markdown += `## Description\n${data.description}\n\n`;
  }
  
  if (data.problem) {
    markdown += `## Problem Statement\n${data.problem}\n\n`;
  }
  
  if (data.technology) {
    markdown += `## Technologies Used\n${data.technology}\n\n`;
  }
  
  if (data.impact) {
    markdown += `## Potential Impact\n${data.impact}\n\n`;
  }
  
  if (data.team && data.team !== 'skip') {
    markdown += `## Team\n${data.team}\n\n`;
  }
  
  if (data.status) {
    markdown += `## Current Status\n${data.status}\n\n`;
  }

  if (data.visibility) {
    let visibilityText = "Private only";
    if (data.visibility === "internal") {
      visibilityText = "Shared with Guild members";
    } else if (data.visibility === "public") {
      visibilityText = "Public on Digital Village website";
    }
    markdown += `## Visibility\n${visibilityText}\n\n`;
  }
  
  return markdown;
}

export function formatMarkdownToHtml(markdown: string): string {
  return markdown
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-3 text-gray-800 pb-2 border-b border-gray-200">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-3 mt-5 text-primary">$1</h2>')
    .replace(/\n/g, '<br>')
    .replace(/<br><br>/g, '<div class="my-2"></div>'); // Add more spacing between paragraphs
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
