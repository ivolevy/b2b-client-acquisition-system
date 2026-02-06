import React from 'react';
import LegalLayout from './LegalLayout';

const Privacy = () => {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated="6 de febrero de 2026">
      <section className="legal-section">
        <h2>1. Recolección de Datos</h2>
        <p>
          En Dota Solutions, la privacidad de nuestros usuarios es fundamental. Recolectamos información necesaria para la prestación de nuestros servicios de adquisición de clientes B2B, incluyendo:
        </p>
        <ul>
          <li>Información de contacto (nombre, email, teléfono).</li>
          <li>Datos de facturación y transacciones.</li>
          <li>Historial de búsquedas y empresas guardadas dentro de la plataforma.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>2. Uso de Tecnologías</h2>
        <p>
          Utilizamos diversas tecnologías para garantizar el funcionamiento óptimo de Smart Leads:
        </p>
        <ul>
          <li><strong>Supabase:</strong> Para el almacenamiento seguro de datos y autenticación de usuarios.</li>
          <li><strong>MercadoPago:</strong> Para el procesamiento seguro de pagos.</li>
          <li><strong>Cookies y Almacenamiento Local:</strong> Utilizamos cookies técnicas y almacenamiento local del navegador para mantener sesiones activas y preferencias de usuario.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Protección y Compartición de Datos</h2>
        <p>
          Dota Solutions no vende ni alquila sus datos a terceros. Los datos solo se comparten con proveedores de servicios necesarios para operar la plataforma (como procesadores de pago o servicios de infraestructura cloud) bajo estrictos acuerdos de confidencialidad.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Derechos del Usuario</h2>
        <p>
          Usted tiene derecho a acceder, rectificar o eliminar sus datos personales en cualquier momento a través de la configuración de su perfil o contactando a nuestro equipo de soporte.
        </p>
      </section>
    </LegalLayout>
  );
};

export default Privacy;
