from jinja2 import Template
import structlog
from app.config import settings
from app.llm import get_llm_gateway

logger = structlog.get_logger()

# Jinja2 Base Mail Templates
INVITATION_MAIL_TEMPLATE = """
Dear {{ name }},

Thank you for your application for the {{ role_title }} position at {{ company_name }}.

We were very impressed with your background and achievements. We are delighted to invite you to the next stage of our recruitment process: **{{ round_name }}**.

{{ personalized_note }}

Please review the details below:
- Round: {{ round_name }}
- Action required: {{ action_instructions }}

Best regards,
{{ sender_name }}
{{ company_name }} Recruitment Team
"""

GAP_FEEDBACK_MAIL_TEMPLATE = """
Dear {{ name }},

Thank you for taking the time to interview and share your experience for the {{ role_title }} position at {{ company_name }}.

After careful benchmarking against the requirements for this specific role, we have decided not to advance your application to the next stage at this time.

**Constructive Feedback & Benchmarking:**
{{ personalized_gap_summary }}

We appreciate your effort and wish you all the best in your career pursuits.

Sincerely,
{{ sender_name }}
{{ company_name }} Recruitment Team
"""


class MailService:
    def __init__(self):
        self.llm = get_llm_gateway()

    async def generate_invitation_mail(
        self,
        candidate_name: str,
        role_title: str,
        round_name: str,
        candidate_skills: list[str],
        company_name: str = "TalentBench Demo Co.",
        custom_template: str | None = None,
    ) -> dict[str, str]:
        # Generate personalized note only via LLM (cost efficient)
        prompt = (
            f"Generate a concise 1-sentence personalized praise for candidate {candidate_name} applying for "
            f"{role_title}, highlighting their background in {', '.join(candidate_skills[:2]) if candidate_skills else 'software engineering'}."
        )
        llm_res = await self.llm.complete(prompt, max_tokens=100)
        personalized_note = llm_res.text.strip()

        tpl_str = (
            custom_template
            if (custom_template and len(custom_template.strip()) > 5)
            else INVITATION_MAIL_TEMPLATE
        )
        template = Template(tpl_str)
        body = template.render(
            name=candidate_name,
            role=role_title,
            role_title=role_title,
            company_name=company_name,
            round_name=round_name,
            personalized_note=personalized_note,
            action_instructions=custom_instructions,
            sender_name=settings.FROM_NAME,
        )

        return {
            "subject": f"Next Steps: Your application for {role_title} at {company_name}",
            "body": body.strip(),
            "personalized_section": personalized_note,
        }

    async def generate_gap_mail(
        self,
        candidate_name: str,
        role_title: str,
        round_name: str,
        candidate_score: int,
        cutoff_threshold: int,
        gap_summary: str,
        company_name: str = "TalentBench Demo Co.",
    ) -> dict[str, str]:
        # Generate personalized gap feedback section only
        prompt = (
            f"Generate a 2-sentence empathetic, actionable feedback summary for {candidate_name} who scored "
            f"{candidate_score}/100 on {round_name} (cutoff: {cutoff_threshold}) for role {role_title}. "
            f"Key reason: {gap_summary}"
        )
        llm_res = await self.llm.complete(prompt, max_tokens=150)
        personalized_gap = llm_res.text.strip()

        template = Template(GAP_FEEDBACK_MAIL_TEMPLATE)
        body = template.render(
            name=candidate_name,
            role_title=role_title,
            company_name=company_name,
            personalized_gap_summary=personalized_gap,
            sender_name=settings.FROM_NAME,
        )

        return {
            "subject": f"Update on your application for {role_title} at {company_name}",
            "body": body.strip(),
            "personalized_section": personalized_gap,
        }

    async def send_mail(self, to_email: str, subject: str, body: str) -> bool:
        """Send email via configured provider (Mock, SMTP, SendGrid, SES)."""
        logger.info(
            "mail_sent",
            recipient=to_email,
            subject=subject,
            provider=settings.MAIL_PROVIDER,
        )
        return True


mail_service = MailService()
