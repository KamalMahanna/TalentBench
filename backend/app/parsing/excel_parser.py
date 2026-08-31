import io
from typing import Any
import pandas as pd


def parse_round_results_excel(file_bytes: bytes) -> list[dict[str, Any]]:
    """
    Parse Excel or CSV file containing round assessment results.
    Expected columns (case-insensitive):
    - Email / Candidate Email / email
    - Name / Candidate Name / name (optional)
    - Score / Test Score / Marks (0-100)
    - Status / Result / Verdict (passed/failed/pending)
    - Summary / Feedback / Remarks (optional)
    """
    try:
        # Try reading as Excel first
        try:
            df = pd.read_excel(io.BytesIO(file_bytes))
        except Exception:
            df = pd.read_csv(io.BytesIO(file_bytes))

        # Normalize column names
        col_map = {}
        for col in df.columns:
            clean = str(col).strip().lower().replace(" ", "_")
            col_map[col] = clean
        df.rename(columns=col_map, inplace=True)

        results = []
        for _, row in df.iterrows():
            email = None
            for key in ["email", "candidate_email", "mail", "user_email"]:
                if key in row and pd.notna(row[key]):
                    email = str(row[key]).strip().lower()
                    break

            if not email:
                continue

            score = 0
            for key in ["score", "test_score", "marks", "total_score", "round_score"]:
                if key in row and pd.notna(row[key]):
                    try:
                        score = int(float(row[key]))
                    except (ValueError, TypeError):
                        score = 0
                    break

            status = "pending"
            for key in ["status", "result", "verdict", "outcome"]:
                if key in row and pd.notna(row[key]):
                    val = str(row[key]).strip().lower()
                    if val in ["pass", "passed", "selected", "shortlisted", "clear"]:
                        status = "passed"
                    elif val in ["fail", "failed", "rejected", "reject"]:
                        status = "failed"
                    else:
                        status = "pending"
                    break

            feedback = ""
            for key in [
                "feedback",
                "summary",
                "remarks",
                "ai_verdict",
                "comments",
                "notes",
            ]:
                if key in row and pd.notna(row[key]):
                    feedback = str(row[key]).strip()
                    break

            results.append(
                {
                    "email": email,
                    "score": score,
                    "status": status,
                    "feedback": feedback,
                }
            )

        return results
    except Exception as e:
        raise ValueError(f"Failed to parse Excel/CSV file: {str(e)}")
