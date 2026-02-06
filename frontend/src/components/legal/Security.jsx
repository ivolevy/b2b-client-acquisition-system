import React from 'react';
import LegalLayout from './LegalLayout';

const Security = () => {
  return (
    <LegalLayout title="Seguridad de la Información" lastUpdated="6 de febrero de 2026">
      <section className="legal-section">
        <h2>1. Infraestructura Segura</h2>
        <p>
          En Dota Solutions, implementamos medidas de seguridad de grado industrial para proteger la integridad de los datos de nuestros usuarios:
        </p>
        <ul>
          <li><strong>Cifrado de Datos:</strong> Todas las comunicaciones entre el cliente y el servidor se realizan mediante protocolos TLS/SSL cifrados.</li>
          <li><strong>Almacenamiento Seguro:</strong> La base de datos y los archivos se gestionan a través de Supabase, que ofrece cifrado en reposo para toda la información sensible.</li>
          <li><strong>Gestión de Contraseñas:</strong> Dota Solutions nunca almacena contraseñas en texto plano. Utilizamos algoritmos de hashing robustos (bcrypt) gestionados por los servicios de autenticación de Supabase.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>2. Medidas de Protección</h2>
        <p>
          Implementamos capas de seguridad adicionales para mitigar riesgos:
        </p>
        <ul>
          <li>Protección contra ataques de fuerza bruta.</li>
          <li>Validación estricta de tokens JWT en cada petición al servidor.</li>
          <li>Aislamiento de datos por usuario (Row Level Security - RLS).</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Reporte de Vulnerabilidades</h2>
        <p>
          Si usted cree haber encontrado una falla de seguridad en Smart Leads, le solicitamos que la reporte de manera responsable contactando directamente a <a href="mailto:ivo.levy03@gmail.com" style={{color: '#3b82f6'}}>ivo.levy03@gmail.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
};

export default Security;
