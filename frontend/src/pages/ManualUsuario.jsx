import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Calendar,
  Code,
  ChevronUp,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import SubPage from "../components/SubPage";
import { useUser } from "../context/UserContext";
import "./ManualUsuario.css";

export default function ManualUsuario() {
  const { t } = useTranslation();
  const { currentUser } = useUser();
  const [activeSection, setActiveSection] = useState("intro");
  const [showBackTop, setShowBackTop] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    const handleScroll = () => {
      // Toggle back to top button
      if (window.scrollY > 300) {
        setShowBackTop(true);
      } else {
        setShowBackTop(false);
      }

      // Update active section in TOC
      const sections = document.querySelectorAll("section[id]");
      let currentSection = "intro";

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 150) {
          currentSection = section.getAttribute("id");
        }
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <SubPage
      icon={<BookOpen size={18} />}
      badge={t("Documentación")}
      title={t("Manual de Usuario")}
      description={t(
        "Guía completa sobre el uso y funcionalidades del Portal de Gestión ETB.",
      )}
    >
      <div className="manual-page">
        {/* Tabla de Contenidos (Sidebar) */}
        <aside className="manual-toc">
          <h3>Contenido</h3>
          <ul className="manual-toc-list">
            <li>
              <a
                href="#intro"
                className={activeSection === "intro" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "intro")}
              >
                1. Introducción
              </a>
            </li>
            <li>
              <a
                href="#requisitos"
                className={activeSection === "requisitos" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "requisitos")}
              >
                2. Requisitos del Sistema
              </a>
            </li>
            <li>
              <a
                href="#arranque"
                className={activeSection === "arranque" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "arranque")}
              >
                3. Arranque del Sistema
              </a>
            </li>
            <li>
              <a
                href="#login"
                className={activeSection === "login" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "login")}
              >
                4. Inicio de Sesión
              </a>
            </li>
            <li>
              <a
                href="#dashboard"
                className={activeSection === "dashboard" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "dashboard")}
              >
                5. Dashboard
              </a>
            </li>
            <li>
              <a
                href="#navbar"
                className={activeSection === "navbar" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "navbar")}
              >
                6. Barra de Navegación
              </a>
            </li>
            <li>
              <a
                href="#mod-limpieza"
                className={activeSection === "mod-limpieza" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "mod-limpieza")}
              >
                7. Limpieza de Equipos
              </a>
            </li>
            <li>
              <a
                href="#mod-creacion"
                className={activeSection === "mod-creacion" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "mod-creacion")}
              >
                8. Creación de Equipos
              </a>
            </li>
            <li>
              <a
                href="#perfil"
                className={activeSection === "perfil" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "perfil")}
              >
                9. Perfil de Usuario
              </a>
            </li>
            <li>
              <a
                href="#admin"
                className={activeSection === "admin" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "admin")}
              >
                10. Administración
              </a>
            </li>
            <li>
              <a
                href="#faq"
                className={activeSection === "faq" ? "active" : ""}
                onClick={(e) => scrollToSection(e, "faq")}
              >
                11. Preguntas Frecuentes
              </a>
            </li>
          </ul>
        </aside>

        {/* Contenido Principal */}
        <div className="manual-content">
          <div className="manual-hero">
            <div className="manual-hero-icon">
              <BookOpen size={32} />
            </div>
            <h1>Manual de Usuario — Portal ETB</h1>
            <div className="manual-hero-meta">
              <span>
                <Calendar size={14} /> Versión 1.2 (Julio 2026)
              </span>
              <span>
                <Code size={14} /> React + Vite + Express + MongoDB + Oracle
              </span>
              {isAdmin && (
                <span className="manual-link-secondary">
                  <Terminal size={14} /> <a href="/manual-tecnico">Ver Manual Técnico</a>
                </span>
              )}
            </div>
          </div>

          <section id="intro" className="manual-section">
            <h2>
              <span className="section-number">1</span> Introducción
            </h2>
            <p>
              El <strong>Portal de Gestión ETB</strong> centraliza las operaciones de
              limpieza, creación y auditoría de equipos. La plataforma está pensada
              para técnicos y administradores que necesitan consultar estados,
              ejecutar procesos y revisar trazabilidad de cada acción.
            </p>

            <h3>Propósito</h3>
            <ul>
              <li>Gestionar y limpiar equipos registrados en Oracle (ONT, STB, TV BOX, etc.)</li>
              <li>Registrar nuevos equipos en el inventario del sistema</li>
              <li>Consultar el estado actual por serial o MAC</li>
              <li>Mantener un registro histórico de operaciones y resultados</li>
              <li>Administrar usuarios, roles y permisos según el tipo de cuenta</li>
            </ul>

            <div className="manual-table-wrap">
              <table className="manual-table">
                <thead>
                  <tr>
                    <th>Rol</th>
                    <th>Descripción</th>
                    <th>Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Usuario</strong>
                    </td>
                    <td>
                      Ejecuta procesos operativos y consulta información relevante del inventario
                    </td>
                    <td>Módulos operativos (Limpieza, Creación, SMW y MSS)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Administrador</strong>
                    </td>
                    <td>
                      Revisa auditoría, gestiona usuarios y supervisa el estado del sistema
                    </td>
                    <td>Panel de Administración (Actividad, Historial y Usuarios)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="requisitos" className="manual-section">
            <h2>
              <span className="section-number">2</span> Requisitos del Sistema
            </h2>
            <h3>Entorno</h3>
            <ul>
              <li>Node.js 18 o superior</li>
              <li>Conexión a la red ETB o VPN activa para acceder a Oracle y LDAP</li>
              <li>Navegador moderno como Google Chrome o Edge</li>
              <li>Credenciales válidas del directorio corporativo o cuenta de prueba habilitada</li>
            </ul>
          </section>

          <section id="arranque" className="manual-section">
            <h2>
              <span className="section-number">3</span> Arranque del Sistema
            </h2>
            <div className="manual-alert alert-important">
              <AlertCircle size={18} />
              <div>
                <strong>Importante:</strong> El backend debe estar activo para que las consultas,
                limpiezas y auditorías funcionen correctamente.
              </div>
            </div>

            <p>La forma recomendada de iniciar la plataforma es:</p>
            <div className="manual-code-block">npm start</div>
            <p>Este comando levanta simultáneamente:</p>
            <ul>
              <li>
                <strong>Frontend:</strong> Vite en <code>http://localhost:5173</code>
              </li>
              <li>
                <strong>Backend:</strong> Express en <code>http://localhost:3001</code>
              </li>
            </ul>
            <p>
              Si desea arrancarlos por separado, use <code>npm run dev</code> para el frontend y
              <code> npm run server</code> para la API.
            </p>
          </section>

          <section id="login" className="manual-section">
            <h2>
              <span className="section-number">4</span> Inicio de Sesión
            </h2>
            <p>
              Al ingresar al portal, el sistema valida las credenciales contra LDAP y,
              al confirmar el acceso, sincroniza los datos del usuario con la base de datos
              interna para mantener perfil, rol y estado.
            </p>

            <h3>Flujo de acceso</h3>
            <ol>
              <li>Ingrese usuario y contraseña en la pantalla de login.</li>
              <li>El backend valida la identidad contra LDAP.</li>
              <li>Si el usuario está activo y su rol es válido, entra al portal.</li>
              <li>La sesión se mantiene para permitir el acceso a módulos protegidos.</li>
            </ol>

            <div className="manual-alert alert-tip">
              <Info size={18} />
              <div>
                <strong>Usuarios inactivos:</strong> si una cuenta está marcada como inactiva,
                el sistema denegará el ingreso hasta que sea reactivada por administración.
              </div>
            </div>
          </section>

          <section id="dashboard" className="manual-section">
            <h2>
              <span className="section-number">5</span> Dashboard
            </h2>
            <p>
              Después de iniciar sesión, el usuario verá un tablero con los módulos disponibles
              según su rol.
            </p>
            <ul>
              <li>
                <strong>Usuarios:</strong> Limpieza de Equipos, Creación de Equipos, Limpieza SMW y
                acceso a la documentación.
              </li>
              <li>
                <strong>Administradores:</strong> Registro de Actividad, Historial de Limpiezas,
                Gestión de Usuarios y visibilidad completa del sistema.
              </li>
            </ul>
            <p>
              El módulo de Limpieza MSS aparece como funcionalidad en desarrollo y puede estar
              temporalmente sin operaciones activas.
            </p>
          </section>

          <section id="navbar" className="manual-section">
            <h2>
              <span className="section-number">6</span> Barra de Navegación
            </h2>
            <p>
              La barra de navegación ofrece acceso rápido a los módulos principales, al perfil del usuario
              y a la documentación del sistema. En pantallas pequeñas se adapta a un menú tipo hamburguesa.
            </p>
          </section>

          <section id="mod-limpieza" className="manual-section">
            <h2>
              <span className="section-number">7</span> Limpieza de Equipos{" "}
              <span className="manual-badge badge-done">Completado</span>
            </h2>
            <p>
              Este módulo permite ejecutar la limpieza lógica y de dependencias de un equipo,
              dejando evidencias del proceso para auditoría.
            </p>

            <h3>Proceso recomendado</h3>
            <ol>
              <li><strong>Validación:</strong> el sistema confirma que el serial y la MAC ingresados son válidos.</li>
              <li><strong>Borrado:</strong> se ejecuta el proceso de limpieza en Oracle.</li>
              <li><strong>Serv. Item:</strong> se limpia la referencia del serial en los ítems de servicio.</li>
              <li><strong>Serv. Req:</strong> se limpia la referencia en solicitudes asociadas.</li>
            </ol>

            <div className="manual-alert alert-tip">
              <Info size={18} />
              <div>
                <strong>Detección automática:</strong> si el equipo ya se encuentra en estado libre,
                retirado o disponible, el sistema advierte que no es necesario procesarlo nuevamente.
              </div>
            </div>

            <div className="manual-alert alert-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>MAC obligatoria:</strong> el campo MAC debe completarse para ejecutar cualquier limpieza.
              </div>
            </div>
          </section>

          <section id="mod-creacion" className="manual-section">
            <h2>
              <span className="section-number">8</span> Creación de Equipos{" "}
              <span className="manual-badge badge-done">Completado</span>
            </h2>
            <p>
              Desde este módulo se registra un nuevo equipo con sus datos básicos y su estado inicial.
            </p>

            <h3>Uso recomendado</h3>
            <p>
              Ingrese tipo, serial, MAC y estado inicial; luego guarde el registro. La opción de
              mantener la plantilla facilita el ingreso repetido de equipos con la misma configuración.
            </p>
          </section>

          <section id="perfil" className="manual-section">
            <h2>
              <span className="section-number">9</span> Perfil de Usuario
            </h2>
            <p>
              El perfil permite revisar la información personal asociada a la cuenta, cambiar el idioma,
              alternar entre tema claro y oscuro, y acceder a la documentación del portal.
            </p>
          </section>

          <section id="admin" className="manual-section">
            <h2>
              <span className="section-number">10</span> Panel de Administración
            </h2>
            <p>
              Exclusivo para administradores. Permite revisar operaciones, filtros, estadísticas y manejo de cuentas.
            </p>
            <ul>
              <li>
                <strong>Registro de Actividad:</strong> muestra operaciones ejecutadas por los usuarios
                y su resultado, integrando información de Oracle y registros locales.
              </li>
              <li>
                <strong>Historial de Limpiezas:</strong> ofrece una vista consolidada de las limpiezas realizadas.
              </li>
              <li>
                <strong>Gestión de Usuarios:</strong> permite administrar estados, roles y accesos de las cuentas.
              </li>
            </ul>
          </section>

          <section id="faq" className="manual-section">
            <h2>
              <span className="section-number">11</span> Preguntas Frecuentes
            </h2>

            <h4>¿Qué hago si aparece el mensaje de que el backend no está respondiendo?</h4>
            <p>
              Verifique que haya ejecutado <code>npm start</code> o <code>npm run server</code>
              desde la raíz del proyecto y que no existan errores en la consola del servidor.
            </p>

            <h4>Error de conexión ORA-XXXXX</h4>
            <p>
              Este tipo de error indica un problema de comunicación con Oracle. Revise las variables
              de conexión en <code>.env</code> y confirme que su red o VPN permita el acceso.
            </p>

            <h4>¿Cómo sé si un equipo ya fue limpiado?</h4>
            <p>
              El sistema valida el estado actual del equipo antes de procesarlo. Si ya está libre,
              retirado o disponible, mostrará una advertencia indicando que no es necesario volver a limpiarlo.
            </p>
          </section>
        </div>
      </div>

      {/* Botón Volver Arriba */}
      <button
        className={`manual-back-top ${showBackTop ? "visible" : ""}`}
        onClick={scrollToTop}
        title="Volver arriba"
      >
        <ChevronUp size={24} />
      </button>
    </SubPage>
  );
}
