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
import "./ManualUsuario.css";

export default function ManualUsuario() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("intro");
  const [showBackTop, setShowBackTop] = useState(false);

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
                <Calendar size={14} /> Versión 1.1 (Junio 2026)
              </span>
              <span>
                <Code size={14} /> React + Vite + Express + Oracle
              </span>
              <span className="manual-link-secondary">
                <Terminal size={14} /> <a href="/manual-tecnico">Ver Manual Técnico</a>
              </span>
            </div>
          </div>

          <section id="intro" className="manual-section">
            <h2>
              <span className="section-number">1</span> Introducción
            </h2>
            <p>
              El <strong>Portal de Gestión ETB</strong> es una plataforma web
              centralizada para la optimización y control de procesos técnicos
              de la empresa ETB. Permite a los técnicos y administradores
              gestionar el inventario de equipos, realizar procesos de limpieza,
              crear nuevos equipos y auditar todas las operaciones.
            </p>

            <h3>Propósito</h3>
            <ul>
              <li>
                Gestionar y limpiar el inventario de equipos (ONT, STB, TV BOX,
                etc.)
              </li>
              <li>Registrar y dar de alta nuevos equipos en el sistema</li>
              <li>Consultar el estado de equipos por número de serial</li>
              <li>
                Mantener un registro de auditoría de todas las operaciones
              </li>
              <li>Administrar usuarios, roles y permisos</li>
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
                      <strong>Usuario (Técnico)</strong>
                    </td>
                    <td>
                      Operador que realiza las tareas de limpieza y creación de
                      equipos
                    </td>
                    <td>Módulos operativos (Limpieza, Creación, SMW, MSS)</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Administrador</strong>
                    </td>
                    <td>
                      Supervisa, audita y gestiona los procesos y usuarios
                    </td>
                    <td>
                      Panel de Administración (Actividad, Historial, Usuarios)
                    </td>
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
              <li>Node.js (v18 o superior)</li>
              <li>
                Conexión a la red ETB (VPN activa si es remoto) para acceso a
                Oracle
              </li>
              <li>Navegador Google Chrome (Recomendado)</li>
            </ul>
          </section>

          <section id="arranque" className="manual-section">
            <h2>
              <span className="section-number">3</span> Arranque del Sistema
            </h2>
            <div className="manual-alert alert-important">
              <AlertCircle size={18} />
              <div>
                <strong>Importante:</strong> El sistema depende de dos procesos
                activos simultáneamente. Si el backend no está corriendo, no
                podrá realizar limpiezas ni consultas a la base de datos Oracle.
              </div>
            </div>

            <p>
              La forma recomendada de iniciar el sistema es mediante el comando
              unificado:
            </p>
            <div className="manual-code-block">npm start</div>
            <p>
              Este comando utiliza <code>concurrently</code> para arrancar:
            </p>
            <ul>
              <li>
                <strong>Frontend:</strong> Vite en{" "}
                <code>http://localhost:5173</code>
              </li>
              <li>
                <strong>Backend (API/Oracle):</strong> Express en{" "}
                <code>http://localhost:3001</code>
              </li>
            </ul>
            <p>
              Si prefiere iniciarlos por separado en terminales diferentes, debe
              ejecutar <code>npm run dev</code> para el frontend y{" "}
              <code>npm run server</code> para el servidor de base de datos.
            </p>
          </section>

          <section id="login" className="manual-section">
            <h2>
              <span className="section-number">4</span> Inicio de Sesión
            </h2>
            <p>
              Al acceder al portal, se presenta la pantalla de inicio de sesión
              que requiere credenciales válidas.
            </p>

            <h3>Credenciales de Prueba</h3>
            <div className="manual-table-wrap">
              <table className="manual-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Contraseña</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>admin</code>
                    </td>
                    <td>
                      <code>admin@etb.com.co</code>
                    </td>
                    <td>
                      <code>Admin123*</code>
                    </td>
                    <td>Administrador</td>
                  </tr>
                  <tr>
                    <td>
                      <code>heimar</code>
                    </td>
                    <td>
                      <code>heimar@etb.com.co</code>
                    </td>
                    <td>
                      <code>Heimar123*</code>
                    </td>
                    <td>Usuario (Técnico)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="dashboard" className="manual-section">
            <h2>
              <span className="section-number">5</span> Dashboard
            </h2>
            <p>
              Dependiendo del rol del usuario, el Dashboard mostrará diferentes
              opciones de acceso rápido.
            </p>
            <ul>
              <li>
                <strong>Técnicos:</strong> Acceso a módulos de Limpieza de
                Equipos, Creación de Equipos, Limpieza SMW y MSS.
              </li>
              <li>
                <strong>Administradores:</strong> Acceso al Registro de
                Actividad, Historial de Limpiezas y Gestión de Usuarios.
              </li>
            </ul>
          </section>

          <section id="navbar" className="manual-section">
            <h2>
              <span className="section-number">6</span> Barra de Navegación
            </h2>
            <p>
              Proporciona acceso rápido a todos los módulos y opciones del
              sistema. En dispositivos móviles se adapta a un menú hamburguesa
              lateral. Contiene el menú de perfil de usuario en la esquina
              derecha.
            </p>
          </section>

          <section id="mod-limpieza" className="manual-section">
            <h2>
              <span className="section-number">7</span> Limpieza de Equipos{" "}
              <span className="manual-badge badge-done">Completado</span>
            </h2>
            <p>
              Permite ejecutar procesos de limpieza sobre equipos registrados,
              desvinculándolos de servicios y marcándolos como LIBRE.
            </p>

            <h3>Proceso de Limpieza (4 Operaciones)</h3>
            <ol>
              <li>
                <strong>Validación:</strong> Verifica que el equipo existe con
                el serial y MAC proporcionados.
              </li>
              <li>
                <strong>Borrado de equipo:</strong> Cambia el estado del equipo
                a LIBRE y RETIRADO.
              </li>
              <li>
                <strong>Limpieza Serv. Item:</strong> Marca el serial con `*` en
                la tabla de ítems de servicio.
              </li>
              <li>
                <strong>Limpieza Serv. Req:</strong> Marca el serial con `*` en
                la tabla de solicitudes.
              </li>
            </ol>

            <div className="manual-alert alert-tip">
              <Info size={18} />
              <div>
                <strong>Detección de Estado:</strong> El sistema ahora detecta
                automáticamente si un equipo ya está limpio. Si al validar el
                serial el estado es <code>LIBRE</code>, <code>DISPONIBLE</code>{" "}
                o <code>RETIRADO</code>, se notificará que no es necesario
                procesarlo nuevamente.
              </div>
            </div>

            <div className="manual-alert alert-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>MAC Obligatoria:</strong> Por seguridad y trazabilidad,
                el campo MAC es ahora obligatorio para ejecutar cualquier
                proceso de limpieza.
              </div>
            </div>
          </section>

          <section id="mod-creacion" className="manual-section">
            <h2>
              <span className="section-number">8</span> Creación de Equipos{" "}
              <span className="manual-badge badge-done">Completado</span>
            </h2>
            <p>
              Registro y alta de nuevos equipos en el inventario del sistema
              especificando tipo, serial, MAC y estado inicial.
            </p>

            <h3>Sistema de Plantilla</h3>
            <p>
              La opción "Mantener configuración de plantilla" permite una
              digitalización masiva más rápida al borrar solo el Serial y la MAC
              después de guardar, manteniendo el Tipo y Estado seleccionados
              para el siguiente ingreso.
            </p>
          </section>

          <section id="perfil" className="manual-section">
            <h2>
              <span className="section-number">9</span> Perfil de Usuario
            </h2>
            <p>
              La página de perfil permite visualizar y editar su información
              personal, cambiar la contraseña, configurar el idioma de la
              interfaz y alternar entre modo oscuro y claro.
            </p>
          </section>

          <section id="admin" className="manual-section">
            <h2>
              <span className="section-number">10</span> Panel de Administración
            </h2>
            <p>
              Exclusivo para usuarios con rol de Administrador. Incluye tres
              submódulos principales:
            </p>
            <ul>
              <li>
                <strong>Registro de Actividad:</strong> Auditoría en tiempo real
                de todas las operaciones realizadas por los usuarios, incluyendo
                origen de datos (Oracle).
              </li>
              <li>
                <strong>Historial de Limpiezas:</strong> Vista detallada de las
                limpiezas ejecutadas en la BD, con estadísticas y filtros por
                serial.
              </li>
              <li>
                <strong>Gestión de Usuarios:</strong> Administración de cuentas.
                Nota: Las cuentas marcadas como <strong>Inactivas</strong>{" "}
                perderán acceso inmediato al sistema y no podrán iniciar sesión
                hasta ser reactivadas.
              </li>
            </ul>
          </section>

          <section id="faq" className="manual-section">
            <h2>
              <span className="section-number">11</span> Preguntas Frecuentes
            </h2>

            <h4>
              ¿Qué hago si aparece el error "¿Está corriendo npm run server?"
            </h4>
            <p>
              Este error indica que la API backend no responde. Asegúrese de
              haber ejecutado <code>npm start</code> o{" "}
              <code>npm run server</code> en la carpeta raíz del proyecto y que
              no haya errores de conexión en la consola.
            </p>

            <h4>Error de conexión ORA-XXXXX</h4>
            <p>
              Si visualiza un error que comienza con "ORA-", significa que hay
              un problema de comunicación con Oracle. Verifique sus credenciales
              en el archivo <code>.env</code> y asegúrese de estar conectado a
              la red interna o VPN de ETB.
            </p>

            <h4>¿Cómo sé si un equipo ya fue limpiado?</h4>
            <p>
              En el módulo de Limpieza de Equipos, el sistema verificará el
              "Estado CPE" en el esquema <code>ASAP</code>. Si el estado ya es
              LIBRE o similar, recibirá una notificación indicando que el equipo
              ya se encuentra procesado.
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
