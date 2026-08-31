import io
from pypdf import PdfReader


def parse_pdf(file_bytes: bytes) -> str:
    """Extract clean text content from PDF bytes."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_text = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
        return "\n\n".join(pages_text)
    except Exception as e:
        return f"Error extracting PDF: {str(e)}"
