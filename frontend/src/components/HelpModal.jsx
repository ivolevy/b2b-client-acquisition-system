import React, { useEffect } from 'react';
import './DatabaseViewer.css';

function HelpModal({ onClose }) {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="db-viewer-overlay" onClick={onClose}>
      <div className="db-viewer-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="db-viewer-header">
          <h2>Guía de Uso del Sistema</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="db-viewer-content" style={{ lineHeight: 1.6, maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Búsqueda de Empresas */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>1. Búsqueda de Empresas</h3>
            <div style={{ paddingLeft: '16px' }}>
              <p><strong>Rubro empresarial:</strong> Selecciona el tipo de negocio que deseas buscar (ej: restaurantes, tiendas, servicios, etc.)</p>
              <p><strong>Ubicación:</strong> Usa el mapa para seleccionar un punto o escribe una dirección. El sistema buscará empresas en un radio configurable (1km a 50km).</p>
              <p><strong>Opciones de búsqueda:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li><strong>Scrapear websites:</strong> Activa esta opción para que el sistema visite los sitios web de las empresas y extraiga automáticamente emails, teléfonos y redes sociales.</li>
                <li><strong>Solo validadas:</strong> Muestra únicamente empresas con datos de contacto validados.</li>
              </ul>
              <p style={{ marginTop: '12px' }}><strong>Botón "Buscar":</strong> Inicia la búsqueda en OpenStreetMap y enriquece los datos encontrados.</p>
            </div>
          </section>

          {/* Filtros */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>2. Filtros y Vistas</h3>
            <div style={{ paddingLeft: '16px' }}>
              <p><strong>Filtros disponibles:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li><strong>Rubro:</strong> Filtra por categoría de negocio</li>
                <li><strong>Ciudad:</strong> Filtra por ciudad específica</li>
                <li><strong>Validación:</strong> Todas / Válidas / Pendientes</li>
                <li><strong>Con Email:</strong> Solo empresas que tienen email</li>
                <li><strong>Con Teléfono:</strong> Solo empresas que tienen teléfono</li>
              </ul>
              <p style={{ marginTop: '12px' }}><strong>Vistas:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li><strong>Tabla:</strong> Vista en formato tabla con todos los datos de las empresas</li>
                <li><strong>Mapa:</strong> Vista geográfica mostrando la ubicación de las empresas</li>
                <li><strong>Emails:</strong> Módulo para enviar emails a las empresas encontradas</li>
              </ul>
            </div>
          </section>

          {/* Módulo de Emails */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>3. Envío de Emails</h3>
            <div style={{ paddingLeft: '16px' }}>
              <p>El módulo de emails permite contactar a las empresas de forma individual o masiva.</p>
              
              <p style={{ marginTop: '12px' }}><strong>Tab "Enviar Emails":</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li><strong>Modo Individual:</strong> Selecciona una empresa y envía un email personalizado</li>
                <li><strong>Modo Masivo:</strong> Selecciona múltiples empresas y envía emails en lote con un delay configurable entre envíos</li>
                <li><strong>Template:</strong> Selecciona un template de email predefinido</li>
                <li><strong>Asunto personalizado:</strong> Opcionalmente, sobrescribe el asunto del template</li>
                <li><strong>Vista Previa:</strong> Al seleccionar una empresa, verás automáticamente cómo se verá el email personalizado para esa empresa</li>
              </ul>

              <p style={{ marginTop: '12px' }}><strong>Tab "Templates":</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li><strong>Ver templates:</strong> Visualiza todos los templates disponibles en formato de cards</li>
                <li><strong>Crear nuevo:</strong> Botón "+ Nuevo Template" para crear un template personalizado</li>
                <li><strong>Editar:</strong> Haz clic en "Editar" en cualquier template para modificarlo</li>
                <li><strong>Eliminar:</strong> Elimina templates personalizados (los templates por defecto no se pueden eliminar)</li>
              </ul>

              <p style={{ marginTop: '12px' }}><strong>Variables en templates:</strong></p>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                <li><code>{'{nombre_empresa}'}</code> - Nombre de la empresa</li>
                <li><code>{'{rubro}'}</code> - Rubro o categoría</li>
                <li><code>{'{ciudad}'}</code> - Ciudad</li>
                <li><code>{'{direccion}'}</code> - Dirección completa</li>
                <li><code>{'{website}'}</code> - Sitio web</li>
                <li><code>{'{fecha}'}</code> - Fecha actual</li>
              </ul>
            </div>
          </section>

          {/* Exportación */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>4. Exportación de Datos</h3>
            <div style={{ paddingLeft: '16px' }}>
              <p><strong>Exportar CSV:</strong> Descarga un archivo CSV con todos los datos de las empresas filtradas, listo para usar en Excel o Google Sheets.</p>
              <p style={{ marginTop: '8px' }}>El archivo incluye: nombre, rubro, email, teléfono, dirección, redes sociales, y más.</p>
            </div>
          </section>

          {/* Base de Datos */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>5. Base de Datos</h3>
            <div style={{ paddingLeft: '16px' }}>
              <p><strong>Ver BD:</strong> Visualiza todas las empresas almacenadas en la base de datos con estadísticas completas.</p>
              <p style={{ marginTop: '8px' }}><strong>Borrar BD:</strong> Elimina todas las empresas de la base de datos. Esta acción no se puede deshacer.</p>
            </div>
          </section>

          {/* Consejos */}
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>Consejos y Mejores Prácticas</h3>
            <div style={{ paddingLeft: '16px' }}>
              <ul style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li>Usa radios de búsqueda más pequeños (1-5km) para resultados más precisos en áreas urbanas</li>
                <li>Activa "Scrapear websites" para obtener más datos de contacto, pero ten en cuenta que toma más tiempo</li>
                <li>Filtra por "Con Email" antes de usar el módulo de emails para ver solo empresas contactables</li>
                <li>Personaliza los templates de email para que reflejen tu propuesta de valor</li>
                <li>En modo masivo, usa un delay de 1-2 segundos entre envíos para evitar problemas con el servidor de email</li>
                <li>Revisa la vista previa antes de enviar para asegurarte de que el email se ve correctamente</li>
                <li>Exporta regularmente tus resultados para tener backups de los datos</li>
              </ul>
            </div>
          </section>

          {/* Configuración SMTP */}
          <section style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
            <h3 style={{ color: '#667eea', marginBottom: '12px', fontSize: '1.25rem' }}>Configuración de Email</h3>
            <div style={{ paddingLeft: '16px' }}>
              <p><strong>Para que el envío de emails funcione:</strong></p>
              <ol style={{ marginLeft: '1.5rem', marginTop: '8px' }}>
                <li>Configura las credenciales SMTP en el archivo <code>.env</code> del backend</li>
                <li>Para Gmail, necesitas crear una "App Password" en lugar de usar tu contraseña normal</li>
                <li>El sistema está configurado para usar <code>solutionsdota@gmail.com</code> por defecto</li>
                <li>Las variables necesarias son: <code>SMTP_PASSWORD</code></li>
              </ol>
          </div>
          </section>

        </div>

        <div className="db-viewer-footer">
          <div className="footer-stats" style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Sistema B2B Client Acquisition - Versión 2.0
          </div>
          <button className="btn-close" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default HelpModal;
