import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Book, Calendar, Code, ChevronUp, AlertCircle, Terminal, Database, Server, Cpu, Globe, Lock, Settings } from 'lucide-react';
import SubPage from '../components/SubPage';
import './ManualUsuario.css'; // Reutilizamos estilos base
import './ManualTecnico.css';

export default function ManualTecnico() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('arch');
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) setShowBackTop(true);
      else setShowBackTop(false);

      const sections = document.querySelectorAll('section[id]');
      let currentSection = 'arch';
      
      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          currentSection = section.getAttribute('id');
        }
      });
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 80, behavior: 'smooth' });
    }
  };

  return (
    <SubPage
      icon={<Terminal size={18} />}
      badge={t('Desarrollo')}
      title={t('Manual Técnico')}
      description={t('Documentación de arquitectura, base de datos y flujos de implementación del Portal ETB.')}
    >
      <div className="manual-page">
        {/* Tabla de Contenidos */}
        <aside className="manual-toc">
          <h3>Arquitectura</h3>
          <ul className="manual-toc-list">
            <li><a href="#arch" className={activeSection === 'arch' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'arch')}>1. Resumen de Arquitectura</a></li>
            <li><a href="#frontend" className={activeSection === 'frontend' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'frontend')}>2. Frontend (React)</a></li>
            <li><a href="#backend" className={activeSection === 'backend' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'backend')}>3. Backend (Express)</a></li>
            <li><a href="#oracle" className={activeSection === 'oracle' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'oracle')}>4. Base de Datos Oracle</a></li>
            <li><a href="#smw" className={activeSection === 'smw' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'smw')}>5. Integración SMW (SOAP)</a></li>
            <li><a href="#flujos" className={activeSection === 'flujos' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'flujos')}>6. Flujos Lógicos</a></li>
            <li><a href="#deploy" className={activeSection === 'deploy' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'deploy')}>7. Instalación y Despliegue</a></li>
            <li><a href="#seguridad" className={activeSection === 'seguridad' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'seguridad')}>8. Seguridad y Sesiones</a></li>
          </ul>
        </aside>

        {/* Contenido Principal */}
        <div className="manual-content">
          <div className="manual-hero technical-hero">
            <div className="manual-hero-icon">
              <Cpu size={32} />
            </div>
            <h1>Manual Técnico — Portal Gestión ETB</h1>
            <div className="manual-hero-meta">
              <span><Calendar size={14} /> Última revisión: Junio 2026</span>
              <span><Code size={14} /> FullStack JavaScript</span>
            </div>
          </div>

          <section id="arch" className="manual-section">
            <h2><span className="section-number">1</span> Resumen de Arquitectura</h2>
            <p>El portal sigue un modelo de aplicación de una sola página (SPA) con un backend desacoplado que actúa como bridge hacia los sistemas legados de ETB (Oracle ASAP).</p>
            
            <div className="tech-stack-grid">
              <div className="tech-card">
                <Globe size={24} />
                <h4>Frontend</h4>
                <p>React 19 + Vite. Estilizado con CSS nativo y variables dinámicas (Glassmorphism).</p>
              </div>
              <div className="tech-card">
                <Server size={24} />
                <h4>Backend</h4>
                <p>Node.js con Express. Gestión de API RESTful y middleware de autenticación.</p>
              </div>
              <div className="tech-card">
                <Database size={24} />
                <h4>Database</h4>
                <p>Oracle Database 19c. Conectividad vía <code>node-oracledb</code> en modo Thin.</p>
              </div>
              <div className="tech-card">
                <Globe size={24} />
                <h4>Integración</h4>
                <p>SMW (Smart Web) a través de servicios SOAP (WSDL) para gestión de inventario geográfico.</p>
              </div>
            </div>
          </section>

          <section id="frontend" className="manual-section">
            <h2><span className="section-number">2</span> Frontend (React)</h2>
            <p>Ubicación: <code>/frontend/src/</code></p>
            
            <h3>Manejo de Estado</h3>
            <ul>
              <li><strong>Context API:</strong> Utilizado para el estado global del usuario (UserContext) y preferencias de tema (ThemeContext).</li>
              <li><strong>Hooks:</strong> Uso intensivo de <code>useState</code>, <code>useEffect</code> y <code>useCallback</code> para la gestión de ciclos de vida de componentes.</li>
            </ul>

            <h3>Servicios</h3>
            <p>Los servicios se encuentran en <code>src/services/</code>. Se utiliza <code>fetch</code> nativo encapsulado para llamadas a la API.</p>
            <ul>
              <li><code>authService.js</code>: Gestión de login y persistencia en LocalStorage.</li>
              <li><code>limpiezaDbService.js</code>: Comunicación con los endpoints de Oracle.</li>
              <li><code>smwService.js</code>: Gestión de integración con SMW/SOAP.</li>
              <li><code>activityLog.js</code>: Registro de acciones para auditoría.</li>
            </ul>
          </section>

          <section id="backend" className="manual-section">
            <h2><span className="section-number">3</span> Backend (Express)</h2>
            <p>Ubicación: <code>/backend/</code></p>
            <p>El servidor Express (puerto 3001) gestiona las peticiones del frontend y las traduce a consultas SQL o llamadas a procedimientos PL/SQL.</p>

            <h3>Endpoints Principales</h3>
            <div className="manual-table-wrap">
              <table className="manual-table">
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Ruta</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>GET</code></td>
                    <td><code>/api/equipos/:serial</code></td>
                    <td>Consulta estado actual en <code>ASAP.equipment</code>.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/limpieza/:serial</code></td>
                    <td>Ejecuta el flujo de 4 pasos de limpieza.</td>
                  </tr>
                  <tr>
                    <td><code>GET</code></td>
                    <td><code>/api/actividad</code></td>
                    <td>Recupera logs unificados para el panel admin.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/login</code></td>
                    <td>Valida credenciales y estado de cuenta (Activo/Inactivo).</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/smw/consultar</code></td>
                    <td>Consulta dirección y RFS activos mediante SOAP.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/smw/limpiar</code></td>
                    <td>Libera recursos en el inventario SMW.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="oracle" className="manual-section">
            <h2><span className="section-number">4</span> Base de Datos Oracle</h2>
            <p>El sistema se conecta al esquema <code>ASAP</code> de la base de datos central de ETB.</p>
            
            <h3>Tablas Críticas</h3>
            <ul>
              <li><strong>ASAP.equipment:</strong> Tabla maestra de equipos (Serial, MAC, Estado Disponibilidad).</li>
              <li><strong>ASAP.equip_ca_value:</strong> Atributos extendidos del equipo (Estado CPE).</li>
              <li><strong>ASAP.serv_item_value:</strong> Instancias de servicios vinculadas a equipos.</li>
              <li><strong>ASAP.serv_req_si_value:</strong> Solicitudes de servicio en curso.</li>
            </ul>

            <h3>Procedimientos PL/SQL</h3>
            <p>El proceso de borrado físico y lógico se delega al procedimiento:</p>
            <div className="manual-code-block">ASAP.BORRADO_EQUIPOS(ASAP.ARRAY_EQUIPOS(serial))</div>
          </section>
          
          <section id="smw" className="manual-section">
            <h2><span className="section-number">5</span> Integración SMW (SOAP)</h2>
            <p>La aplicación interactúa con el inventario SMW (Smart Web) mediante servicios SOAP 1.2 para la gestión de recursos de red.</p>
            
            <div className="connection-info">
              <div className="connection-card">
                <h5>Georreferenciación</h5>
                <p>Endpoint: <code>SMW_GEOREF_URL</code></p>
                <small>Obtiene el <code>CodigoDireccion</code> a partir de la dirección normalizada.</small>
              </div>
              <div className="connection-card">
                <h5>Inventario RFS</h5>
                <p>Endpoint: <code>SMW_RFS_URL</code></p>
                <small>Consulta todos los recursos físicos asociados a la dirección.</small>
              </div>
              <div className="connection-card">
                <h5>Liberación M6</h5>
                <p>Endpoint: <code>SMW_LIBERAR_URL</code></p>
                <small>Ejecuta la limpieza lógica y física de los puertos en SMW.</small>
              </div>
            </div>
          </section>

          <section id="flujos" className="manual-section">
            <h2><span className="section-number">5</span> Flujos Lógicos</h2>
            
            <h3>Algoritmo de Limpieza (Post /api/limpieza)</h3>
            <ol>
              <li><strong>Validación (OP1):</strong> Consulta si el serial existe y su estado actual.</li>
              <li><strong>Filtro de Estado:</strong> Si el estado es LIBRE/RETIRADO, cancela con advertencia.</li>
              <li><strong>Borrado (OP2):</strong> Ejecuta <code>BORRADO_EQUIPOS</code> en Oracle.</li>
              <li><strong>Limpieza de Ítems (OP3):</strong> Ejecuta <code>UPDATE serv_item_value SET valid_value = valid_value || '*'</code>.</li>
              <li><strong>Limpieza de Requerimientos (OP4):</strong> Ejecuta <code>UPDATE serv_req_si_value SET valid_value = valid_value || '*'</code>.</li>
              <li><strong>Logging:</strong> Inserta el resultado de cada etapa en la tabla local de logs del servidor.</li>
            </ol>

            <h3 style={{ marginTop: '2rem' }}>Flujo de Limpieza SMW (Smart Web)</h3>
            <ol>
              <li><strong>Georreferenciación:</strong> Se envía la dirección para obtener el ID interno de SMW.</li>
              <li><strong>Descubrimiento:</strong> Se solicitan los RFS vinculados al ID de dirección.</li>
              <li><strong>Validación de Recursos:</strong> Se filtran los RFS activos (Identificador RFS_).</li>
              <li><strong>Liberación:</strong> Se envía comando SOAP <code>M6LiberarRecursos</code> para cada RFS encontrado.</li>
            </ol>
          </section>

          <section id="deploy" className="manual-section">
            <h2><span className="section-number">6</span> Instalación y Despliegue</h2>
            
            <h3>Requisitos de Entorno</h3>
            <p>Variables requeridas en el archivo <code>.env</code>:</p>
            <ul>
              <li><code>DB_USER</code>: Usuario esquema Oracle.</li>
              <li><code>DB_PASSWORD</code>: Credencial base de datos.</li>
              <li><code>DB_CONNECTION_STRING</code>: Host, puerto y SID/Service Name.</li>
              <li><code>SMW_GEOREF_URL</code>: Endpoint del servicio de Georreferenciación SMW.</li>
              <li><code>SMW_RFS_URL</code>: Endpoint del servicio de consulta de RFS SMW.</li>
              <li><code>SMW_LIBERAR_URL</code>: Endpoint del servicio de liberación de recursos SMW.</li>
              <li><code>PORT</code>: Puerto del servidor (default 3001).</li>
            </ul>

            <h3>Scripts de NPM</h3>
            <ul>
              <li><code>npm start</code>: Inicia frontend y backend simultáneamente (Concurrently).</li>
              <li><code>npm run server</code>: Inicia solo la API Node.js.</li>
              <li><code>npm run dev</code>: Inicia solo el entorno de desarrollo Vite.</li>
              <li><code>npm run build</code>: Genera el bundle de producción del frontend.</li>
            </ul>
          </section>

          <section id="seguridad" className="manual-section">
            <h2><span className="section-number">7</span> Seguridad y Sesiones</h2>
            <p>La seguridad se implementa en múltiples capas:</p>
            <ul>
              <li><strong>Cross-Origin Resource Sharing (CORS):</strong> Restringido para aceptar peticiones solo desde el dominio del portal.</li>
              <li><strong>Inactivity Guard:</strong> El backend valida en cada login si el usuario está marcado como <code>Inactivo</code>. El frontend detecta este estado y fuerza el cierre de sesión mediante el componente <code>ProtectedRoute</code>.</li>
              <li><strong>Audit Log:</strong> Todas las transacciones fallidas o exitosas se registran con el usuario, timestamp y etapa exacta del error.</li>
            </ul>
          </section>
        </div>
      </div>

      <button 
        className={`manual-back-top ${showBackTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronUp size={24} />
      </button>
    </SubPage>
  );
}
