
import logging
import sys
from bs4 import BeautifulSoup
from backend.scraper import extraer_emails_b2b, extraer_telefonos_b2b, buscar_en_paginas_adicionales, ScraperSession

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_scraper")

def test_extraction():
    # 1. Test Emails with obfuscation
    html_emails = """
    <html>
        <body>
            <p>Contáctanos en contacto@empresa.com o info [at] empresa.com</p>
            <a href="mailto:ventas@empresa.com">Ventas</a>
        </body>
    </html>
    """
    soup_emails = BeautifulSoup(html_emails, 'html.parser')
    emails = extraer_emails_b2b(soup_emails, soup_emails.get_text())
    logger.info(f"Emails encontrados: {emails}")
    assert "contacto@empresa.com" in emails
    assert "info@empresa.com" in emails
    assert "ventas@empresa.com" in emails

    # 2. Test WhatsApp and Phones
    html_phones = """
    <html>
        <body>
            <p>Llámanos al (011) 4567-8901 o al +54 9 11 1234 5678</p>
            <a href="https://wa.me/5491167891234">WhatsApp Directo</a>
            <a href="tel:08003331234">0800</a>
        </body>
    </html>
    """
    soup_phones = BeautifulSoup(html_phones, 'html.parser')
    phones = extraer_telefonos_b2b(soup_phones, soup_phones.get_text())
    logger.info(f"Teléfonos encontrados: {phones}")
    assert any("4567-8901" in p for p in phones)
    assert any("5491167891234" in p for p in phones)
    assert any("08003331234" in p for p in phones)

    logger.info("✅ Extracción básica verificada correctamente.")

def test_real_world():
    # Test with a real B2B site (optional, using ScraperSession)
    session = ScraperSession()
    url = "https://www.mercadolibre.com.ar" # Un ejemplo seguro
    logger.info(f"Probando descubrimiento en: {url}")
    soup = session.get_soup(url)
    if soup:
        data = buscar_en_paginas_adicionales(url, soup, session)
        logger.info(f"Datos de sub-páginas: {data}")

if __name__ == "__main__":
    try:
        test_extraction()
        # test_real_world() # Descomentar para prueba real si es necesario
    except Exception as e:
        logger.error(f"❌ Falló la verificación: {e}")
        sys.exit(1)
