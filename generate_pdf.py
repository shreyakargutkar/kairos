import re
import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def clean_markdown_formatting(text):
    # Convert bold **text** to ReportLab <b>text</b>
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Convert code `code` to ReportLab <font face="Courier">code</font>
    text = re.sub(r'`(.*?)`', r'<font face="Courier" color="#b45309"><b>\1</b></font>', text)
    return text

def build_pdf(md_filepath, pdf_filepath):
    # Setup document
    margin = 54 # 0.75 inch margin
    doc = SimpleDocTemplate(
        pdf_filepath,
        pagesize=letter,
        rightMargin=margin,
        leftMargin=margin,
        topMargin=margin,
        bottomMargin=margin
    )

    # Stylesheet setup
    styles = getSampleStyleSheet()
    
    # Custom color palette (Ink & Gold theme matching Kairos)
    primary_color = colors.HexColor("#1e1b4b")  # Deep Navy/Indigo
    secondary_color = colors.HexColor("#b45309") # Gold/Amber
    text_color = colors.HexColor("#334155")     # Slate Gray
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=13,
        leading=16,
        textColor=secondary_color,
        spaceAfter=25
    )
    
    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=primary_color,
        spaceBefore=18,
        spaceAfter=8
    )
    
    h3_style = ParagraphStyle(
        'Header3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=secondary_color,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_color,
        leftIndent=20,
        firstLineIndent=-10,
        spaceAfter=5
    )

    story = []
    
    # Read the markdown file
    if not os.path.exists(md_filepath):
        print(f"Error: {md_filepath} does not exist.")
        return
        
    with open(md_filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_list = False
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            if in_list:
                story.append(Spacer(1, 6))
            in_list = False
            continue
            
        # Parse titles and headers
        if stripped.startswith("# "):
            title_text = clean_markdown_formatting(stripped[2:])
            story.append(Paragraph(title_text, title_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=2, spaceAfter=8))
        elif stripped.startswith("## "):
            h2_text = clean_markdown_formatting(stripped[3:])
            story.append(Paragraph(h2_text, h2_style))
        elif stripped.startswith("### "):
            h3_text = clean_markdown_formatting(stripped[4:])
            story.append(Paragraph(h3_text, h3_style))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = clean_markdown_formatting(stripped[2:])
            bullet_html = f"&bull;&nbsp;&nbsp;{bullet_text}"
            story.append(Paragraph(bullet_html, bullet_style))
            in_list = True
        elif stripped.startswith("---"):
            story.append(Spacer(1, 10))
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=5, spaceAfter=15))
            story.append(Spacer(1, 10))
        else:
            # Paragraph text
            # Handle block quotes or subtitles
            if stripped.startswith("- **Application Name:**") or stripped.startswith("- **Deployment URL"):
                # Style info list items nicely
                bullet_text = clean_markdown_formatting(stripped[2:])
                story.append(Paragraph(f"&bull;&nbsp;&nbsp;{bullet_text}", bullet_style))
            elif stripped.startswith("Kairós (from the ancient Greek") or stripped.startswith("Kairós extracts your skills") or "The Opportune Interview Simulator" in stripped:
                sub_text = clean_markdown_formatting(stripped)
                story.append(Paragraph(sub_text, subtitle_style))
            else:
                body_text = clean_markdown_formatting(stripped)
                story.append(Paragraph(body_text, body_style))

    # Build the document
    doc.build(story)
    print(f"Successfully generated PDF: {pdf_filepath}")

if __name__ == "__main__":
    build_pdf("concept_note.md", "Concept_Note.pdf")
