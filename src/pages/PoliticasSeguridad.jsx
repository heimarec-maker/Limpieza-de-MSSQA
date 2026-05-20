import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, AlertTriangle, UserCheck, Key, Database, ChevronUp, Clock, FileText } from 'lucide-react';
import SubPage from '../components/SubPage';
import './PoliticasSeguridad.css'; // Podemos reutilizar una estructura similar al manual

export default function PoliticasSeguridad() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('intro');
  const [showBackTop, setShowBackTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackTop(true);
      } else {
        setShowBackTop(false);
      }

      const sections = document.querySelectorAll('section[id]');
      let currentSection = 'intro';
      
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
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <SubPage
      icon={<ShieldCheck size={18} />}
      badge={t('Seguridad')}
      title={t('Políticas de Seguridad')}
      description={t('Normativas, protocolos y recomendaciones para el uso seguro del Portal de Gestión ETB.')}
    >
      <div className="security-page">
        {/* Tabla de Contenidos (Sidebar) */}
        <aside className="security-toc">
          <h3>Contenido</h3>
          <ul className="security-toc-list">
            <li><a href="#intro" className={activeSection === 'intro' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'intro')}>1. Introducción</a></li>
            <li><a href="#acceso" className={activeSection === 'acceso' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'acceso')}>2. Control de Acceso y Autenticación</a></li>
            <li><a href="#roles" className={activeSection === 'roles' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'roles')}>3. Roles y Privilegios</a></li>
            <li><a href="#auditoria" className={activeSection === 'auditoria' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'auditoria')}>4. Auditoría y Trazabilidad</a></li>
            <li><a href="#datos" className={activeSection === 'datos' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'datos')}>5. Protección de Datos</a></li>
            <li><a href="#sesiones" className={activeSection === 'sesiones' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'sesiones')}>6. Manejo de Sesiones</a></li>
            <li><a href="#responsabilidades" className={activeSection === 'responsabilidades' ? 'active' : ''} onClick={(e) => scrollToSection(e, 'responsabilidades')}>7. Responsabilidad del Usuario</a></li>
          </ul>
        </aside>

        {/* Contenido Principal */}
        <div className="security-content">
          <div className="security-hero">
            <div className="security-hero-icon">
              <ShieldCheck size={40} strokeWidth={2} />
            </div>
            <h1>Políticas de Seguridad de la Información</h1>
            <div className="security-hero-meta">
              <span><Clock size={14} /> Última actualización: Mayo 2026</span>
              <span><FileText size={14} /> Clasificación: Uso Interno Confidencial</span>
            </div>
          </div>

          <section id="intro" className="security-section">
            <h2><span className="section-number">1</span> Introducción</h2>
            <p>El propósito de este documento es establecer los lineamientos de seguridad que rigen el acceso y uso del <strong>Portal de Gestión ETB</strong>. Estas políticas buscan garantizar la confidencialidad, integridad y disponibilidad de la información de los equipos y procesos operativos de ETB.</p>
            <p>Todo usuario que ingrese al portal está obligado a cumplir con estas normativas. Cualquier desviación o incumplimiento podrá ser sujeto de sanciones disciplinarias según el reglamento interno de trabajo de ETB.</p>
          </section>

          <section id="acceso" className="security-section">
            <h2><span className="section-number">2</span> Control de Acceso y Autenticación <Key size={20} className="section-icon" /></h2>
            <p>El ingreso al portal está estrictamente controlado mediante credenciales únicas e intransferibles.</p>
            
            <h3>Políticas de Contraseña:</h3>
            <ul>
              <li><strong>Longitud mínima:</strong> 8 caracteres.</li>
              <li><strong>Complejidad:</strong> Debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial (ej. !@#$%^&*).</li>
              <li><strong>Almacenamiento:</strong> Las contraseñas se almacenan mediante algoritmos de hash (hashing unidireccional). El sistema no almacena contraseñas en texto claro en ninguna base de datos.</li>
              <li><strong>Cambio:</strong> Se sugiere cambiar la contraseña periódicamente. El portal cuenta con una herramienta en la sección de Perfil para realizar el cambio seguro.</li>
            </ul>

            <div className="security-alert alert-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>Advertencia:</strong> El préstamo o uso compartido de credenciales está totalmente prohibido. Cada usuario es responsable de todas las operaciones realizadas bajo su cuenta.
              </div>
            </div>
          </section>

          <section id="roles" className="security-section">
            <h2><span className="section-number">3</span> Roles y Privilegios <UserCheck size={20} className="section-icon" /></h2>
            <p>El portal aplica el principio de <strong>Mínimo Privilegio (Least Privilege)</strong>. Los usuarios solo tendrán acceso a los módulos necesarios para su rol.</p>
            
            <div className="security-table-wrap">
              <table className="security-table">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Nivel de Acceso</th>
                    <th>Restricciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Administrador</strong></td>
                    <td>Acceso total a logs, historial global y gestión de cuentas.</td>
                    <td>No debe usar cuentas genéricas. Toda acción queda registrada bajo su ID.</td>
                  </tr>
                  <tr>
                    <td><strong>Operador/Técnico</strong></td>
                    <td>Acceso a módulos operativos (Limpiezas y Creación).</td>
                    <td>No tiene acceso a los paneles de administración ni visualización de logs globales.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="auditoria" className="security-section">
            <h2><span className="section-number">4</span> Auditoría y Trazabilidad <ShieldCheck size={20} className="section-icon" /></h2>
            <p>El sistema cuenta con un módulo riguroso de auditoría que registra de forma inmutable todas las transacciones realizadas en la plataforma.</p>
            <ul>
              <li><strong>Registro de Limpiezas:</strong> Cada vez que se ejecuta una limpieza de un serial, se registra el ID del usuario, la MAC, el timestamp (fecha y hora exacta), y el resultado (Éxito o Error).</li>
              <li><strong>Registro de Creaciones:</strong> Todo nuevo equipo agregado al sistema es asociado inmediatamente al usuario que efectuó la transacción.</li>
              <li><strong>Panel Administrativo:</strong> El equipo de supervisión puede visualizar y exportar el <em>Registro de Actividad</em> completo ante cualquier requerimiento de seguridad o auditoría interna.</li>
            </ul>
          </section>

          <section id="datos" className="security-section">
            <h2><span className="section-number">5</span> Protección de Datos <Database size={20} className="section-icon" /></h2>
            <p>La información manejada por este portal (seriales, direcciones MAC y datos de clientes asociados a equipos) es <strong>Confidencial</strong>.</p>
            <ul>
              <li>No se permite la extracción no autorizada (Scraping) masiva de datos.</li>
              <li>Las exportaciones (CSV) están habilitadas únicamente para reportes operativos del mismo día y uso interno.</li>
              <li>Los respaldos de la base de datos (SQLite) se realizan en entornos seguros y no son accesibles desde el frontend.</li>
            </ul>
          </section>

          <section id="sesiones" className="security-section">
            <h2><span className="section-number">6</span> Manejo de Sesiones <Lock size={20} className="section-icon" /></h2>
            <p>Para prevenir el secuestro de sesión y garantizar que equipos desatendidos no sean vulnerables:</p>
            <ul>
              <li><strong>Cierre explícito:</strong> El usuario siempre debe utilizar el botón "Cerrar sesión" antes de abandonar su puesto de trabajo.</li>
              <li><strong>Inactividad:</strong> (Próximamente) El sistema cerrará automáticamente las sesiones tras un periodo prolongado de inactividad.</li>
              <li><strong>Almacenamiento Local:</strong> Los tokens de sesión y preferencias del usuario (Local Storage) se manejan de manera segura sin exponer datos sensibles críticos.</li>
            </ul>
          </section>

          <section id="responsabilidades" className="security-section">
            <h2><span className="section-number">7</span> Responsabilidad del Usuario</h2>
            <p>Como usuario del Portal de Gestión ETB, usted se compromete a:</p>
            <ol>
              <li>Proteger sus credenciales y notificar inmediatamente cualquier sospecha de compromiso de su cuenta.</li>
              <li>Verificar cuidadosamente los números de serie y MAC antes de ejecutar cualquier limpieza (un borrado erróneo afecta la provisión de servicios).</li>
              <li>Asegurarse de acceder a la plataforma únicamente desde equipos y redes corporativas o conexiones VPN autorizadas por ETB.</li>
              <li>Reportar al área de soporte técnico cualquier comportamiento inusual o errores en el aplicativo.</li>
            </ol>
          </section>
        </div>
      </div>

      {/* Botón Volver Arriba */}
      <button 
        className={`security-back-top ${showBackTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        title="Volver arriba"
      >
        <ChevronUp size={24} />
      </button>
    </SubPage>
  );
}
