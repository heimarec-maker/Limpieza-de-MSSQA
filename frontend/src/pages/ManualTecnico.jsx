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
              <span><Calendar size={14} /> Última revisión: Julio 2026</span>
              <span><Code size={14} /> FullStack JavaScript</span>
            </div>
          </div>

          <section id="arch" className="manual-section">
            <h2><span className="section-number">1</span> Resumen de Arquitectura</h2>
            <p>La aplicación sigue un modelo SPA con un backend desacoplado que actúa como puente hacia los sistemas legados de ETB. La capa de negocio se apoya en Oracle ASAP, mientras que la autenticación usa LDAP y la información de perfil se persiste en MongoDB.</p>
            
            <div className="tech-stack-grid">
              <div className="tech-card">
                <Globe size={24} />
                <h4>Frontend</h4>
                <p>React 19 + Vite, con rutas protegidas, contexto de usuario y tema, y componentes reutilizables para cada módulo.</p>
              </div>
              <div className="tech-card">
                <Server size={24} />
                <h4>Backend</h4>
                <p>Node.js con Express, middleware para sesiones y endpoints REST para Oracle, LDAP y auditoría.</p>
              </div>
              <div className="tech-card">
                <Database size={24} />
                <h4>Base de datos</h4>
                <p>Oracle ASAP para inventario y limpieza, y MongoDB para usuarios, roles y registro de sesión.</p>
              </div>
              <div className="tech-card">
                <Globe size={24} />
                <h4>Integraciones</h4>
                <p>SMW mediante SOAP para georreferenciación, consulta de RFS y liberación de recursos; MSS queda como módulo en desarrollo.</p>
              </div>
            </div>
          </section>

          <section id="frontend" className="manual-section">
            <h2><span className="section-number">2</span> Frontend (React)</h2>
            <p>Ubicación: <code>/frontend/src/</code></p>
            
            <h3>Manejo de estado</h3>
            <ul>
              <li><strong>Context API:</strong> usado para el estado global de usuario y preferencias de tema.</li>
              <li><strong>ProtectedRoute:</strong> bloquea el acceso a rutas según rol y sesión activa.</li>
            </ul>

            <h3>Servicios principales</h3>
            <ul>
              <li><code>authService.js</code>: autenticación y persistencia de sesión.</li>
              <li><code>limpiezaDbService.js</code>: comunicación con la API para limpieza y consulta de equipos.</li>
              <li><code>smwService.js</code>: integración con SOAP de SMW.</li>
              <li><code>activityLog.js</code>: registro y exportación de actividad para administración.</li>
            </ul>
          </section>

          <section id="backend" className="manual-section">
            <h2><span className="section-number">3</span> Backend (Express)</h2>
            <p>Ubicación: <code>/backend/</code></p>
            <p>El servidor Express recibe peticiones del frontend, valida usuarios, ejecuta lógica de negocio y traduce operaciones a consultas Oracle o llamadas SOAP.</p>

            <h3>Endpoints principales</h3>
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
                    <td>Consulta el estado del equipo en <code>ASAP.equipment</code>.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/limpieza/:serial</code></td>
                    <td>Ejecuta el flujo de limpieza en 4 etapas.</td>
                  </tr>
                  <tr>
                    <td><code>GET</code></td>
                    <td><code>/api/actividad</code></td>
                    <td>Recupera logs unificados para el panel administrativo.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/login</code></td>
                    <td>Valida credenciales LDAP y carga/actualiza el usuario en MongoDB.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/smw/consultar</code></td>
                    <td>Consulta direcciones y recursos RFS mediante SOAP.</td>
                  </tr>
                  <tr>
                    <td><code>POST</code></td>
                    <td><code>/api/smw/limpiar</code></td>
                    <td>Libera recursos asociados a una dirección en SMW.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="oracle" className="manual-section">
            <h2><span className="section-number">4</span> Base de Datos y Modelo de Datos</h2>
            <p>El sistema se conecta al esquema <code>ASAP</code> de la base de datos central para consultar y limpiar equipos. Además, usa MongoDB para persistir usuarios, roles y estado de sesión.</p>
            
            <h3>Tablas críticas</h3>
            <ul>
              <li><strong>ASAP.equipment:</strong> tabla maestra de equipos.</li>
              <li><strong>ASAP.equip_ca_value:</strong> atributos extendidos del equipo, incluyendo estado CPE.</li>
              <li><strong>ASAP.serv_item_value:</strong> referencias de servicio vinculadas a equipos.</li>
              <li><strong>ASAP.serv_req_si_value:</strong> solicitudes de servicio asociadas al serial.</li>
            </ul>

            <h3>Procedimiento principal</h3>
            <p>El borrado de equipo se delega a:</p>
            <div className="manual-code-block">ASAP.BORRADO_EQUIPOS(ASAP.ARRAY_EQUIPOS(serial))</div>
          </section>
          
          <section id="smw" className="manual-section">
            <h2><span className="section-number">5</span> Integración SMW (SOAP)</h2>
            <p>El módulo SMW interactúa con servicios SOAP para georreferenciar direcciones y liberar recursos físicos.</p>
            
            <div className="connection-info">
              <div className="connection-card">
                <h5>Georreferenciación</h5>
                <p>Endpoint: <code>SMW_GEOREF_URL</code></p>
                <small>Obtiene el <code>CodigoDireccion</code> a partir de una dirección normalizada.</small>
              </div>
              <div className="connection-card">
                <h5>Inventario RFS</h5>
                <p>Endpoint: <code>SMW_RFS_URL</code></p>
                <small>Consulta los recursos físicos asociados a la dirección.</small>
              </div>
              <div className="connection-card">
                <h5>Liberación M6</h5>
                <p>Endpoint: <code>SMW_LIBERAR_URL</code></p>
                <small>Ejecuta la limpieza lógica y física de los puertos en SMW.</small>
              </div>
            </div>
          </section>

          <section id="flujos" className="manual-section">
            <h2><span className="section-number">6</span> Flujos Lógicos</h2>
            
            <h3>Algoritmo de limpieza</h3>
            <ol>
              <li><strong>Validación:</strong> se consulta el estado del equipo y se confirma serial/MAC.</li>
              <li><strong>Filtro de estado:</strong> si ya aparece como libre o retirado, el sistema corta el proceso con advertencia.</li>
              <li><strong>Borrado:</strong> se ejecuta <code>BORRADO_EQUIPOS</code> en Oracle.</li>
              <li><strong>Serv. Item:</strong> se actualizan los registros relacionados en <code>serv_item_value</code>.</li>
              <li><strong>Serv. Req:</strong> se actualizan los registros ligados en <code>serv_req_si_value</code>.</li>
              <li><strong>Auditoría:</strong> cada paso genera evidencia para el panel de actividad.</li>
            </ol>

            <h3 style={{ marginTop: '2rem' }}>Flujo de auditoría administrativa</h3>
            <ol>
              <li>Se fusionan logs locales y provenientes de Oracle.</li>
              <li>Se ordenan por timestamp y se agrupan para la vista del panel.</li>
              <li>El administrador puede filtrar por usuario, acción, resultado y texto libre.</li>
            </ol>
          </section>

          <section id="deploy" className="manual-section">
            <h2><span className="section-number">7</span> Instalación y Despliegue</h2>
            
            <h3>Variables de entorno</h3>
            <p>Las variables requeridas se configuran en <code>.env</code>:</p>
            <ul>
              <li><code>DB_USER</code>, <code>DB_PASSWORD</code> y <code>DB_CONNECTION_STRING</code> para Oracle.</li>
              <li><code>SMW_GEOREF_URL</code>, <code>SMW_RFS_URL</code> y <code>SMW_LIBERAR_URL</code> para SOAP.</li>
              <li><code>LDAP_URL</code>, <code>LDAP_ADMIN_DN</code>, <code>LDAP_ADMIN_PASSWORD</code> y <code>LDAP_USER_SEARCH_BASE</code> para autenticación.</li>
              <li><code>PORT</code> para el backend (por defecto 3001).</li>
            </ul>

            <h3>Scripts de NPM</h3>
            <ul>
              <li><code>npm start</code>: levanta frontend y backend simultáneamente.</li>
              <li><code>npm run server</code>: inicia solo la API.</li>
              <li><code>npm run dev</code>: inicia solo Vite.</li>
              <li><code>npm run build</code>: genera el bundle de producción.</li>
            </ul>
          </section>

          <section id="seguridad" className="manual-section">
            <h2><span className="section-number">8</span> Seguridad y Sesiones</h2>
            <p>La seguridad se implementa en varias capas:</p>
            <ul>
              <li><strong>Autenticación LDAP:</strong> valida identidad antes de autorizar el acceso.</li>
              <li><strong>Control por roles:</strong> las rutas y módulos se protegen con <code>ProtectedRoute</code>.</li>
              <li><strong>Sesiones de usuario:</strong> los datos de sesión se almacenan server-side y se usan para verificar acceso.</li>
              <li><strong>Auditoría:</strong> cada accion importante queda registrada con usuario, fecha y resultado.</li>
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
