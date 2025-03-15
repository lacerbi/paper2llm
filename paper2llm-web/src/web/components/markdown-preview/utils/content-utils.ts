import { MarkdownSections } from "../../../../core/utils/markdown-splitter";
import { generateBibTeXFromMarkdown } from "../../../../core/utils/bibtex-generator";
import { SectionType, ImageMetrics } from "../types";

/**
 * Gets content for a specific section of the markdown document
 * 
 * @param markdownSections The split markdown sections object
 * @param section The section type to get content for
 * @param addTitle Whether to add a title header to the section
 * @returns The content of the requested section or null if not available
 */
export const getSectionContent = (
  markdownSections: MarkdownSections | null,
  markdown: string,
  section: SectionType,
  addTitle: boolean = false
): string | null => {
  if (!markdownSections) return null;

  let content: string | null;
  switch (section) {
    case "full":
      content = markdown;
      break;
    case "main":
      content = markdownSections.mainContent;
      break;
    case "appendix":
      content = markdownSections.appendix;
      break;
    case "backmatter":
      content = markdownSections.backmatter;
      break;
    case "allparts":
      // Get all parts with titles and concatenate them
      const parts: string[] = [];

      // Add main content first (always present)
      if (markdownSections.mainContent) {
        parts.push(markdownSections.mainContent);
      }

      // Add appendix if present
      if (markdownSections.appendix) {
        const title = markdownSections.title;
        const appendixContent = addTitle
          ? `# ${title} - Appendix\n\n---\n\n${markdownSections.appendix}`
          : markdownSections.appendix;
        parts.push(appendixContent);
      }

      // Add backmatter if present
      if (markdownSections.backmatter) {
        const title = markdownSections.title;
        const backmatterContent = addTitle
          ? `# ${title} - Backmatter\n\n---\n\n${markdownSections.backmatter}`
          : markdownSections.backmatter;
        parts.push(backmatterContent);
      }

      content = parts.join("\n\n");
      break;
    default:
      return null;
  }

  if (!content) return null;

  // Add title header for appendix and backmatter if requested
  if (
    addTitle &&
    (section === "appendix" || section === "backmatter") &&
    markdownSections
  ) {
    const title = markdownSections.title;
    const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
    const headerContent = `# ${title} - ${sectionTitle}\n\n---\n\n`;
    content = headerContent + content;
  }

  return content;
};

/**
 * Get content with optional BibTeX citation added
 * 
 * @param markdownSections The split markdown sections
 * @param markdown The full markdown content
 * @param section The section to get content for
 * @param includeBibtex Whether to include BibTeX citation
 * @param addTitle Whether to add a title header
 * @returns Promise resolving to content string or null
 */
export const getContentWithOptionalBibtex = async (
  markdownSections: MarkdownSections | null,
  markdown: string,
  section: SectionType,
  includeBibtex: boolean,
  addTitle: boolean = false
): Promise<string | null> => {
  const content = getSectionContent(markdownSections, markdown, section, addTitle);

  if (!content) return null;

  // If BibTeX is not requested, return the content as is
  if (!includeBibtex) return content;

  // Only add BibTeX to the full document or main content
  if (section === "full" || section === "main" || section === "allparts") {
    const bibtex = await generateBibTeXFromMarkdown(content);
    return `\`\`\`\n${bibtex}\n\`\`\`\n\n---\n\n${content}`;
  }

  return content;
};

/**
 * Gets a display name for a section type
 * 
 * @param section The section type
 * @returns Human-readable section name
 */
export const getSectionDisplayName = (section: SectionType): string => {
  switch (section) {
    case "full":
      return "Full document";
    case "main":
      return "Main content";
    case "appendix":
      return "Appendix";
    case "backmatter":
      return "Backmatter";
    case "allparts":
      return "All Parts";
    default:
      return "Document";
  }
};

/**
 * Calculates metrics about images in the markdown content
 * 
 * @param markdown The markdown content to analyze
 * @returns Object with image metrics
 */
export const calculateImageMetrics = (markdown: string): ImageMetrics => {
  // Count all markdown image references (standard format)
  const markdownImageCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || [])
    .length;

  // Count all images with descriptions
  const describedImageCount = (
    markdown.match(/> \*\*Image Description:\*\*/g) || []
  ).length;

  // Use the larger of the two counts for total images, ensuring describedImageCount is never > originalImageCount
  // This handles cases where images were processed but aren't in markdown syntax
  const originalImageCount = Math.max(
    markdownImageCount,
    describedImageCount
  );

  return {
    originalImageCount,
    describedImageCount,
    hasProcessedImages: describedImageCount > 0,
  };
};
