
import smtplib
import os
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load env from backend
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', 'solutionsdota@gmail.com')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', 'solutionsdota@gmail.com')

def test_smtp():
    print(f"Testing SMTP with {SMTP_USER} via {SMTP_HOST}:{SMTP_PORT}...")
    
    if not SMTP_PASSWORD:
        print("Error: SMTP_PASSWORD is empty")
        return

    msg = MIMEMultipart()
    msg['Subject'] = "Test Diagnostic Email"
    msg['From'] = SMTP_USER
    msg['To'] = SMTP_USER # Send to self
    msg.attach(MIMEText("This is a diagnostic test.", 'plain'))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.set_debuglevel(1)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print("✅ SMTP Success: Email sent to self.")
    except Exception as e:
        print(f"❌ SMTP Failure: {str(e)}")

if __name__ == "__main__":
    test_smtp()
