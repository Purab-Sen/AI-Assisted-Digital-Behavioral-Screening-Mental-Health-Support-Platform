"""
Email Service
=============
Sends transactional emails via SMTP (TLS).
If MAIL_USERNAME is not configured the email is logged instead —
useful for local development / CI without a real SMTP server.
"""
import smtplib
import ssl
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_base_html(title: str, body_html: str) -> str:
    """Wrap body HTML in a consistent, responsive email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);
                        padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                          letter-spacing:0.3px;">ASD Screening Platform</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.80);font-size:13px;">
                AI-Assisted Behavioral Screening
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              {body_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:24px 40px;text-align:center;
                        border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.6;">
                This email was sent by <strong>ASD Screening Platform</strong>.<br/>
                If you did not initiate this action, please ignore this email or
                <a href="mailto:{settings.MAIL_FROM}" style="color:#4F46E5;text-decoration:none;">
                  contact our support team</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _send_sync(to_email: str, subject: str, html: str) -> None:
    """Synchronous SMTP send — runs in a thread-pool executor."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    # Ensure replies are routed to the admin/support inbox if configured
    reply_to = settings.MAIL_ADMIN_EMAIL or settings.MAIL_USERNAME or settings.MAIL_FROM
    msg["Reply-To"] = reply_to
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT, timeout=15) as server:
            if settings.MAIL_USE_TLS:
                server.starttls(context=context)
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
        logger.info("Email sent to %s — %s", to_email, subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        raise


async def _send_email(to_email: str, subject: str, html: str) -> None:
    """Async wrapper — falls back to log-only mode if SMTP not configured."""
    if not settings.MAIL_USERNAME:
        logger.info(
            "[EMAIL – log-only mode]\n  To: %s\n  Subject: %s\n"
            "  (Set MAIL_USERNAME in .env to enable real delivery)",
            to_email, subject
        )
        return
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_sync, to_email, subject, html)


# ===========================================================================
# Public email functions
# ===========================================================================

async def send_otp_email(to_email: str, first_name: str, otp: str) -> None:
    """Send a 6-digit email-verification OTP."""
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        Verify your email address
      </h2>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Hi <strong>{first_name}</strong>, welcome to the ASD Screening Platform!<br/>
        Use the code below to complete your registration.
      </p>

      <!-- OTP box -->
      <div style="background:#EEF2FF;border:2px dashed #4F46E5;border-radius:12px;
                  text-align:center;padding:32px 20px;margin:0 0 24px;">
        <p style="margin:0 0 8px;color:#4F46E5;font-size:13px;font-weight:600;
                  letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
        <span style="font-size:48px;font-weight:800;color:#1E1B4B;letter-spacing:12px;
                     font-family:'Courier New',monospace;">{otp}</span>
        <p style="margin:12px 0 0;color:#9CA3AF;font-size:12px;">
          Valid for <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong> · Do not share this code
        </p>
      </div>

      <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    """
    html = _build_base_html("Email Verification", body)
    await _send_email(to_email, "Your ASD Platform verification code", html)


async def send_welcome_email(to_email: str, first_name: str) -> None:
    """Send a welcome email after successful email verification."""
    dashboard_url = f"{settings.FRONTEND_URL}/dashboard"
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        You&#39;re all set, {first_name}! 🎉
      </h2>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Your email has been verified and your account is now active.
        The ASD Screening Platform is here to support behavioural screening and
        connect you with professionals when you need them.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#F0FDF4;border-left:4px solid #22C55E;
                      border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">
              What you can do now
            </p>
            <ul style="margin:8px 0 0 16px;padding:0;color:#166534;font-size:13px;line-height:1.8;">
              <li>Take an AQ-10 behavioural screening</li>
              <li>Complete cognitive tasks</li>
              <li>Keep a private journal</li>
              <li>Connect with a healthcare professional</li>
            </ul>
          </td>
        </tr>
      </table>

      <a href="{dashboard_url}"
         style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);
                color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Go to your Dashboard →
      </a>
    """
    html = _build_base_html("Welcome!", body)
    await _send_email(to_email, f"Welcome to ASD Screening Platform, {first_name}!", html)


async def send_professional_application_received(
    to_email: str, first_name: str, specialty: Optional[str]
) -> None:
    """Confirm to the applicant that their professional application was received."""
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        Application received
      </h2>
      <p style="margin:0 0 20px;color:#6B7280;font-size:15px;line-height:1.6;">
        Hi <strong>{first_name}</strong>,<br/><br/>
        Thank you for applying to join the platform as a verified healthcare professional
        {f'in <strong>{specialty}</strong>' if specialty else ''}.
        Our admin team will review your licence details and get back to you shortly.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F59E0B;
                      border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0;color:#92400E;font-size:14px;font-weight:600;">
              What happens next?
            </p>
            <ul style="margin:8px 0 0 16px;padding:0;color:#92400E;font-size:13px;line-height:1.8;">
              <li>An admin will verify your licence number</li>
              <li>You will receive an email once a decision is made</li>
              <li>Approval typically takes 1-3 business days</li>
            </ul>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#6B7280;font-size:13px;line-height:1.6;">
        In the meantime you can still use the platform as a regular user.
      </p>
    """
    html = _build_base_html("Professional Application Received", body)
    await _send_email(to_email, "Your professional application is under review", html)


async def send_admin_new_professional_application(
    admin_email: str,
    applicant_name: str,
    applicant_email: str,
    specialty: Optional[str],
    institution: Optional[str],
) -> None:
    """Alert the configured admin email that a new professional application is pending."""
    admin_url = f"{settings.FRONTEND_URL}/admin/users"
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        New professional application
      </h2>
      <p style="margin:0 0 20px;color:#6B7280;font-size:15px;line-height:1.6;">
        A user has submitted a professional profile and is waiting for licence verification.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0"
             style="border-collapse:collapse;margin:0 0 28px;">
        <tr style="background:#F9FAFB;">
          <td style="padding:12px 16px;border:1px solid #E5E7EB;font-weight:600;
                      color:#374151;width:35%;font-size:13px;">Applicant</td>
          <td style="padding:12px 16px;border:1px solid #E5E7EB;color:#111827;
                      font-size:13px;">{applicant_name}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border:1px solid #E5E7EB;font-weight:600;
                      color:#374151;font-size:13px;">Email</td>
          <td style="padding:12px 16px;border:1px solid #E5E7EB;color:#111827;
                      font-size:13px;">{applicant_email}</td>
        </tr>
        <tr style="background:#F9FAFB;">
          <td style="padding:12px 16px;border:1px solid #E5E7EB;font-weight:600;
                      color:#374151;font-size:13px;">Specialty</td>
          <td style="padding:12px 16px;border:1px solid #E5E7EB;color:#111827;
                      font-size:13px;">{specialty or '—'}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;border:1px solid #E5E7EB;font-weight:600;
                      color:#374151;font-size:13px;">Institution</td>
          <td style="padding:12px 16px;border:1px solid #E5E7EB;color:#111827;
                      font-size:13px;">{institution or '—'}</td>
        </tr>
      </table>

      <a href="{admin_url}"
         style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);
                color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Review in Admin Panel →
      </a>
    """
    html = _build_base_html("New Professional Application", body)
    await _send_email(admin_email, f"[Admin] New professional application: {applicant_name}", html)


async def send_professional_approved(to_email: str, first_name: str) -> None:
    """Email the professional when their application is approved."""
    dashboard_url = f"{settings.FRONTEND_URL}/professional"
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        Congratulations — you&#39;re now a verified professional! ✅
      </h2>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Hi <strong>{first_name}</strong>,<br/><br/>
        We&#39;re pleased to inform you that your professional licence has been
        verified by our admin team. Your account has been upgraded and you now
        have access to the full professional dashboard.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#F0FDF4;border-left:4px solid #22C55E;
                      border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">
              Professional access includes
            </p>
            <ul style="margin:8px 0 0 16px;padding:0;color:#166534;font-size:13px;line-height:1.8;">
              <li>View screening &amp; journal data of patients who share with you</li>
              <li>Accept consultation requests</li>
              <li>Add professional notes to patient profiles</li>
              <li>Access aggregated patient analytics</li>
            </ul>
          </td>
        </tr>
      </table>

      <a href="{dashboard_url}"
         style="display:inline-block;background:linear-gradient(135deg,#22C55E,#16A34A);
                color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Open Professional Dashboard →
      </a>
    """
    html = _build_base_html("Application Approved", body)
    await _send_email(
        to_email,
        "Your professional application has been approved!",
        html
    )


async def send_professional_rejected(
    to_email: str, first_name: str, reason: Optional[str]
) -> None:
    """Email the professional when their application is rejected."""
    reason_block = (
        f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr>
            <td style="background:#FEF2F2;border-left:4px solid #EF4444;
                        border-radius:0 8px 8px 0;padding:16px 20px;">
              <p style="margin:0 0 4px;color:#991B1B;font-size:14px;font-weight:600;">
                Reason provided by the admin
              </p>
              <p style="margin:0;color:#7F1D1D;font-size:13px;line-height:1.6;">{reason}</p>
            </td>
          </tr>
        </table>
        """
        if reason
        else ""
    )
    contact_url = f"mailto:{settings.MAIL_FROM}"
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        Professional application update
      </h2>
      <p style="margin:0 0 20px;color:#6B7280;font-size:15px;line-height:1.6;">
        Hi <strong>{first_name}</strong>,<br/><br/>
        After reviewing your professional licence submission, we were unable to
        verify your credentials at this time. We&#39;re sorry for the inconvenience.
      </p>

      {reason_block}

      <p style="margin:0 0 24px;color:#6B7280;font-size:14px;line-height:1.6;">
        If you believe this is an error or would like to resubmit updated credentials,
        please reply to this email or contact our support team.
      </p>

      <a href="{contact_url}"
         style="display:inline-block;background:#EF4444;color:#ffffff;
                text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Contact Support
      </a>
    """
    html = _build_base_html("Professional Application Update", body)
    await _send_email(
        to_email,
        "Update on your professional application",
        html
    )


async def send_password_reset_otp(to_email: str, first_name: str, otp: str) -> None:
    """Send a 6-digit OTP for password reset."""
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        Reset your password
      </h2>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Hi <strong>{first_name}</strong>,<br/><br/>
        We received a request to reset the password for your account.
        Use the code below to proceed. If you did not request this, you can safely ignore this email.
      </p>

      <!-- OTP box -->
      <div style="background:#EEF2FF;border:2px dashed #4F46E5;border-radius:12px;
                  text-align:center;padding:32px 20px;margin:0 0 24px;">
        <p style="margin:0 0 8px;color:#4F46E5;font-size:13px;font-weight:600;
                  letter-spacing:1px;text-transform:uppercase;">Password reset code</p>
        <span style="font-size:48px;font-weight:800;color:#1E1B4B;letter-spacing:12px;
                     font-family:'Courier New',monospace;">{otp}</span>
        <p style="margin:12px 0 0;color:#9CA3AF;font-size:12px;">
          Valid for <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong> · Do not share this code
        </p>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F59E0B;
                      border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0;color:#92400E;font-size:14px;font-weight:600;">
              ⚠ Didn&#39;t request this?
            </p>
            <p style="margin:6px 0 0;color:#92400E;font-size:13px;line-height:1.6;">
              If you didn&#39;t request a password reset, no action is needed —
              your password has not been changed.
            </p>
          </td>
        </tr>
      </table>
    """
    html = _build_base_html("Password Reset", body)
    await _send_email(to_email, "Your ASD Platform password reset code", html)


async def send_password_changed_alert(to_email: str, first_name: str) -> None:
    """Security alert sent when a user changes their password."""
    support_url = f"mailto:{settings.MAIL_FROM}"
    body = f"""
      <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:700;">
        Your password was changed
      </h2>
      <p style="margin:0 0 24px;color:#6B7280;font-size:15px;line-height:1.6;">
        Hi <strong>{first_name}</strong>,<br/><br/>
        This is a confirmation that the password for your ASD Screening Platform
        account was successfully changed.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F59E0B;
                      border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0;color:#92400E;font-size:14px;font-weight:600;">
              ⚠ Not you?
            </p>
            <p style="margin:6px 0 0;color:#92400E;font-size:13px;line-height:1.6;">
              If you did not change your password, please contact our support team
              immediately so we can secure your account.
            </p>
          </td>
        </tr>
      </table>

      <a href="{support_url}"
         style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);
                color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;
                font-size:15px;font-weight:600;">
        Contact Support
      </a>
    """
    html = _build_base_html("Password Changed", body)
    await _send_email(
        to_email,
        "Your ASD Platform password was changed",
        html
    )
