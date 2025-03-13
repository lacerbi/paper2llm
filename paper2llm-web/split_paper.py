#!/usr/bin/env python3
# AI Summary: Splits academic papers in Markdown format into main, backmatter, and appendix files.
# Identifies section boundaries using regex patterns for different heading formats.
# Uses input filename as base for output files and preserves page markers.

import os
import re
import argparse
import sys
from pathlib import Path

def extract_title(content):
    """
    Extract the title from the first level-1 header in the content.
    If no title is found, extract from BibTeX citation.
    """
    # First try to find title from level-1 header
    title_match = re.search(r'^# (.+?)$', content, re.MULTILINE)
    if title_match:
        return title_match.group(1).strip()
    
    # If no header title found, try to extract from BibTeX citation
    bibtex_match = re.search(r'title={([^}]*)}', content)
    if bibtex_match:
        return bibtex_match.group(1).strip()
    
    # If no title can be found, use a placeholder
    return "Untitled_Paper"

def get_base_filename(input_file):
    """
    Get the base filename from the input file path without extension.
    """
    # Extract just the filename without path and without extension
    return os.path.splitext(os.path.basename(input_file))[0]

def find_section_boundaries(content):
    """
    Find the boundaries for main content, backmatter, and appendix.
    Returns a tuple of (main_end, appendix_start) line indices.
    Also checks for page markers before section headers.
    """
    # Define regex patterns for different section headers
    # Match variations of acknowledgment sections and impact statements (different heading levels and spellings)
    ack_patterns = [
        r'^#+\s+(Acknowledgments?)\b',
        r'^#+\s+(Acknowledgements?)\b',
        r'^#+\s+Author\s+(Contributions|contributions)',
        r'^#+\s+Funding',
        r'^#+\s+Impact\s+(Statement|statement)',
        r'^#+\s+Broader\s+(Impact|impact)',
        r'^#+\s+Societal\s+(Impact|impact)',
        r'^#+\s+Ethical\s+(Considerations|considerations)'
    ]
    
    # Match variations of appendix/supplementary sections (including lowercase variants)
    appendix_patterns = [
        r'^#+\s+(Appendix|Appendices|appendix|appendices)\b',
        r'^#+\s+(Supplementary|Supporting|supplementary|supporting)\s+(Material|Materials|Information|Data|material|materials|information|data)',
        r'^#+\s+(Supplemental|supplemental)\s+',
        r'^#+\s+SI\s+',
        r'^#+\s+S\d+\.\s+',  # Matches S1., S2., etc. (common in supplementary sections)
        r'^#+\s+A\s+',       # Matches headings starting with "A " (common appendix format)
        r'^#+\s+A\.\s+'      # Matches headings starting with "A. " (common appendix format)
    ]
    
    # Pattern for page markers
    page_marker_pattern = r'^#{3,4}\s+Page\s+\d+\s*$'
    
    # Find acknowledgment section
    ack_start = None
    ack_match = None
    for pattern in ack_patterns:
        match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
        if match and (ack_match is None or match.start() < ack_match.start()):
            ack_match = match
            ack_start = match.start()
    
    # Find appendix section
    appendix_start = None
    appendix_match = None
    for pattern in appendix_patterns:
        match = re.search(pattern, content, re.MULTILINE | re.IGNORECASE)
        if match and (appendix_match is None or match.start() < appendix_match.start()):
            # For "A " or "A. " patterns, verify they occur after acknowledgments to avoid false positives
            if (pattern == r'^#+\s+A\s+' or pattern == r'^#+\s+A\.\s+') and ack_start is not None:
                # Only accept the match if it occurs after acknowledgments
                if match.start() > ack_start:
                    appendix_match = match
                    appendix_start = match.start()
            else:
                # For all other patterns, accept the match as normal
                appendix_match = match
                appendix_start = match.start()
    
    # Check for page markers before sections
    if ack_start is not None:
        # Look for page marker before backmatter section (acknowledgments/impact statement)
        content_before_ack = content[:ack_start]
        lines_before_ack = content_before_ack.split('\n')
        
        # Start from the end and look for page marker
        for i in range(len(lines_before_ack) - 1, max(0, len(lines_before_ack) - 5), -1):
            if re.match(page_marker_pattern, lines_before_ack[i], re.IGNORECASE):
                # Found a page marker, adjust ack_start to include it
                line_pos = content_before_ack.rfind(lines_before_ack[i])
                if line_pos >= 0:
                    ack_start = line_pos
                break
    
    if appendix_start is not None:
        # Look for page marker before appendix section
        content_before_appendix = content[:appendix_start]
        lines_before_appendix = content_before_appendix.split('\n')
        
        # Start from the end and look for page marker
        for i in range(len(lines_before_appendix) - 1, max(0, len(lines_before_appendix) - 5), -1):
            if re.match(page_marker_pattern, lines_before_appendix[i], re.IGNORECASE):
                # Found a page marker, adjust appendix_start to include it
                line_pos = content_before_appendix.rfind(lines_before_appendix[i])
                if line_pos >= 0:
                    appendix_start = line_pos
                break
    
    # If both ack and appendix are found, ensure they're in the right order
    if ack_start is not None and appendix_start is not None:
        # If ack appears after appendix, we probably found a mention of acknowledgments in the appendix
        # In this case, ignore the ack we found and look for one before the appendix
        if ack_start > appendix_start:
            ack_content = content[:appendix_start]
            ack_start = None
            for pattern in ack_patterns:
                match = re.search(pattern, ack_content, re.MULTILINE | re.IGNORECASE)
                if match:
                    ack_start = match.start()
                    # Check for page marker before this ack section
                    content_before_new_ack = content[:ack_start]
                    lines_before_new_ack = content_before_new_ack.split('\n')
                    for i in range(len(lines_before_new_ack) - 1, max(0, len(lines_before_new_ack) - 5), -1):
                        if re.match(page_marker_pattern, lines_before_new_ack[i], re.IGNORECASE):
                            line_pos = content_before_new_ack.rfind(lines_before_new_ack[i])
                            if line_pos >= 0:
                                ack_start = line_pos
                            break
                    break
    
    return (ack_start, appendix_start)

def split_paper(input_file, output_dir=None):
    """
    Split a paper into main, backmatter, and appendix (if exists) files.
    """
    # Read the input file
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File {input_file} not found.")
        return False
    except Exception as e:
        print(f"Error reading file {input_file}: {e}")
        return False
    
    # Extract title for section headers
    title = extract_title(content)
    
    # Use the input filename as the base filename
    base_filename = get_base_filename(input_file)
    
    # Determine the output directory
    if output_dir is None:
        output_dir = os.path.dirname(input_file)
        if not output_dir:  # If input_file is just a filename with no directory
            output_dir = '.'
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Get the paths for output files
    main_file = os.path.join(output_dir, f"{base_filename}.md")
    backmatter_file = os.path.join(output_dir, f"{base_filename}_backmatter.md")
    appendix_file = os.path.join(output_dir, f"{base_filename}_appendix.md")
    
    # Find section boundaries
    ack_start, appendix_start = find_section_boundaries(content)
    
    # Split the content
    main_content = content
    backmatter_content = None
    appendix_content = None
    
    # If we found an appendix section
    if appendix_start is not None:
        appendix_content = content[appendix_start:]
        main_content = content[:appendix_start]
    
    # If we found a backmatter section (acknowledgments or impact statement)
    if ack_start is not None:
        # Adjust indices if appendix was already extracted
        if appendix_start is not None and ack_start > appendix_start:
            # Acknowledgments is after appendix start, meaning it's in the appendix
            # Already handled by the boundary check in find_section_boundaries
            pass
        else:
            backmatter_content = main_content[ack_start:]
            main_content = main_content[:ack_start]
    
    # Clean up content (remove trailing "---" and whitespace)
    main_content = re.sub(r'---\s*$', '', main_content).strip()
    if backmatter_content:
        backmatter_content = re.sub(r'---\s*$', '', backmatter_content).strip()
    if appendix_content:
        appendix_content = re.sub(r'---\s*$', '', appendix_content).strip()
    
    # Add section headers to the files with "---" separator
    if backmatter_content:
        backmatter_content = f"# {title} - Backmatter\n\n---\n\n{backmatter_content}"
    if appendix_content:
        appendix_content = f"# {title} - Appendix\n\n---\n\n{appendix_content}"
    
    # Ensure main content has the title (replace if exists)
    main_content = re.sub(r'^# .*$', f"# {title}", main_content, count=1, flags=re.MULTILINE)

    # Write the output files
    try:
        with open(main_file, 'w', encoding='utf-8') as f:
            f.write(main_content)
        print(f"Created main file: {main_file}")
        
        if backmatter_content:
            with open(backmatter_file, 'w', encoding='utf-8') as f:
                f.write(backmatter_content)
            print(f"Created backmatter file: {backmatter_file}")
        else:
            print("No backmatter (impact statement/acknowledgments/references) section found.")
        
        if appendix_content:
            with open(appendix_file, 'w', encoding='utf-8') as f:
                f.write(appendix_content)
            print(f"Created appendix file: {appendix_file}")
        else:
            print("No appendix section found.")
            
        return True
    except Exception as e:
        print(f"Error writing output files: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Split a Markdown academic paper into main, backmatter, and appendix files.')
    parser.add_argument('input_file', help='Path to the input Markdown file')
    parser.add_argument('-o', '--output-dir', help='Directory to write the output files (defaults to same directory as input)')
    
    args = parser.parse_args()
    
    if not os.path.isfile(args.input_file):
        print(f"Error: Input file '{args.input_file}' not found.")
        return 1
    
    success = split_paper(args.input_file, args.output_dir)
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
