import re
from typing import Any

KNOWN_SKILLS = [
    "Python",
    "FastAPI",
    "Django",
    "Flask",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Kafka",
    "RabbitMQ",
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Express",
    "GraphQL",
    "REST",
    "gRPC",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "Terraform",
    "CI/CD",
    "Git",
    "System Design",
    "Microservices",
    "Distributed Systems",
    "SQLAlchemy",
    "Celery",
    "Pandas",
    "NumPy",
    "PyTorch",
    "TensorFlow",
    "Scikit-Learn",
    "Java",
    "Spring Boot",
    "Go",
    "Rust",
    "C++",
    "Linux",
]

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")


def extract_candidate_metadata(text: str) -> dict[str, Any]:
    """Extract candidate email, phone, extracted skills from raw text."""
    emails = EMAIL_REGEX.findall(text)
    email = emails[0].lower() if emails else ""

    phones = PHONE_REGEX.findall(text)
    phone = phones[0] if phones else ""

    # Skill matching
    found_skills = []
    text_lower = text.lower()
    for skill in KNOWN_SKILLS:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.append(skill)

    # Name extraction heuristic (first non-empty line)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    name = lines[0] if lines else "Candidate"
    if len(name) > 50 or "@" in name:
        name = "Candidate"

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": found_skills,
    }
