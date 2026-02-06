import React from 'react';
import LegalLayout from './LegalLayout';

const Terms = () => {
  return (
    <LegalLayout title="Términos y Condiciones" lastUpdated="6 de febrero de 2026">
      <section className="legal-section">
        <h2>1. Aceptación de los Términos</h2>
        <p>
          Al acceder y utilizar Smart Leads, plataforma propiedad de Dota Solutions, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Uso del Servicio</h2>
        <p>
          El usuario se compromete a:
        </p>
        <ul>
          <li>Proporcionar información veraz durante el registro.</li>
          <li>No utilizar la plataforma para actividades ilícitas o spam masivo no autorizado.</li>
          <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Limitación de Responsabilidad</h2>
        <p>
          Dota Solutions proporciona herramientas de obtención de datos basadas en fuentes públicas y APIs de terceros. No nos hacemos responsables por:
        </p>
        <ul>
          <li>La exactitud total de los datos obtenidos (debido a cambios en las fuentes originales).</li>
          <li>El uso que el usuario haga de la información obtenida.</li>
          <li>Interrupciones temporales del servicio por mantenimiento o fallas en servicios de terceros.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Propiedad Intelectual</h2>
        <p>
          Todo el contenido, diseño y código de Smart Leads es propiedad exclusiva de Dota Solutions. Queda prohibida su reproducción total o parcial sin consentimiento previo.
        </p>
      </section>
    </LegalLayout>
  );
};

export default Terms;
