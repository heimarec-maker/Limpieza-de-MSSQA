import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  HelpCircle, Phone, Mail, Clock, Send, 
  CheckCircle, AlertTriangle, Info, BookOpen, 
  ShieldCheck, Server, Database, Activity,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SubPage from '../components/SubPage';
import './SoporteTecnico.css';

export default function SoporteTecnico() {
  const { t } = useTranslation();
  const [ticketStatus, setTicketStatus] = useState('idle'); // idle, loading, success
  const [openFaq, setOpenFaq] = useState(null);

  // Datos simulados del estado del sistema
  const systemStatus = [
    { name: 'Servidor Principal (API)', status: 'operational', icon: Server },
    { name: 'Base de Datos SQLite', status: 'operational', icon: Database },
    { name: 'Sistema MSS (Externo)', status: 'degraded', icon: Activity },
    { name: 'Sistema SMW (Externo)', status: 'operational', icon: Activity },
  ];

  const faqs = [
    {
      id: 1,
      q: '¿Qué hago si me aparece "Error de conexión con el servidor"?',
      a: 'Verifique que el backend esté en ejecución. Si está en entorno local, asegúrese de haber corrido "npm start" o "npm run server" en la terminal de Node. Si el problema persiste, contacte al administrador de red.'
    },
    {
      id: 2,
      q: 'No puedo realizar una limpieza masiva, me da error.',
      a: 'Asegúrese de que el formato de los datos sea correcto. Cada línea debe contener un Serial y una MAC separados por coma, punto y coma o tabulación. No incluya encabezados en el cuadro de texto.'
    },
    {
      id: 3,
      q: 'Olvidé mi contraseña, ¿cómo la recupero?',
      a: 'Por políticas de seguridad, las contraseñas deben ser restablecidas por un Administrador del sistema. Envíe un ticket solicitando el restablecimiento o contacte a la mesa de ayuda.'
    },
    {
      id: 4,
      q: '¿Por qué un equipo me aparece como "No encontrado"?',
      a: 'Significa que el número de Serial ingresado no existe en la base de datos local. Verifique que el serial esté escrito correctamente (sin espacios adicionales) e inténtelo nuevamente.'
    }
  ];

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    setTicketStatus('loading');
    
    // Simulación de envío de ticket
    setTimeout(() => {
      setTicketStatus('success');
      e.target.reset();
      
      // Volver a estado idle después de 4 segundos
      setTimeout(() => setTicketStatus('idle'), 4000);
    }, 1500);
  };

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <SubPage
      icon={<HelpCircle size={18} />}
      badge={t('Asistencia')}
      title={t('Soporte Técnico')}
      description={t('Centro de ayuda, reporte de incidencias y estado del sistema.')}
    >
      <div className="support-container">
        
        {/* Columna Izquierda: Contacto y Ticket */}
        <div className="support-left">
          
          {/* Canales de Contacto */}
          <section className="support-card contact-card">
            <h2 className="support-card-title">{t('Canales de Atención')}</h2>
            <p className="support-card-desc">{t('Comuníquese directamente con la mesa de ayuda de ETB.')}</p>
            
            <div className="contact-grid">
              <div className="contact-item">
                <div className="contact-icon"><Phone size={24} /></div>
                <div>
                  <h4>PBX / Línea Directa</h4>
                  <p>+57 601 377 7777 (Ext. 1024)</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Mail size={24} /></div>
                <div>
                  <h4>Correo Electrónico</h4>
                  <p>soporte.portal@etb.com.co</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon"><Clock size={24} /></div>
                <div>
                  <h4>Horario de Atención</h4>
                  <p>Lunes a Viernes: 7:00 AM - 5:00 PM</p>
                </div>
              </div>
            </div>
          </section>

          {/* Formulario de Tickets */}
          <section className="support-card ticket-card">
            <h2 className="support-card-title">{t('Reportar Incidencia')}</h2>
            <p className="support-card-desc">{t('Abra un ticket de soporte y nuestro equipo lo atenderá a la brevedad.')}</p>
            
            {ticketStatus === 'success' ? (
              <div className="ticket-success">
                <CheckCircle size={48} />
                <h3>¡Ticket Enviado!</h3>
                <p>Hemos recibido su reporte. Su número de ticket es <strong>#TK-{Math.floor(Math.random() * 10000)}</strong>.</p>
              </div>
            ) : (
              <form className="ticket-form" onSubmit={handleTicketSubmit}>
                <div className="form-group">
                  <label>Tipo de Problema *</label>
                  <select required className="support-input">
                    <option value="">Seleccione una opción...</option>
                    <option value="login">Problemas de acceso / Login</option>
                    <option value="limpieza">Error al limpiar equipos</option>
                    <option value="creacion">Error al crear equipos</option>
                    <option value="rendimiento">Lentitud en el portal</option>
                    <option value="otro">Otro problema técnico</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Descripción detallada *</label>
                  <textarea 
                    required 
                    className="support-input support-textarea" 
                    placeholder="Describa el error, incluyendo los pasos que realizó antes de que ocurriera..."
                    rows={4}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Evidencia (Opcional)</label>
                  <input type="file" className="support-file-input" accept="image/*,.pdf" />
                  <small className="form-hint">Formatos soportados: JPG, PNG, PDF (Max 5MB)</small>
                </div>

                <button 
                  type="submit" 
                  className="support-btn-submit"
                  disabled={ticketStatus === 'loading'}
                >
                  {ticketStatus === 'loading' ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <><Send size={18} /> {t('Enviar Reporte')}</>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Columna Derecha: Estado, FAQ y Base de conocimiento */}
        <div className="support-right">
          
          {/* Estado del Sistema */}
          <section className="support-card status-card">
            <h2 className="support-card-title">{t('Estado del Sistema')}</h2>
            
            <div className="status-list">
              {systemStatus.map((sys, idx) => {
                const Icon = sys.icon;
                return (
                  <div key={idx} className="status-item">
                    <div className="status-item-left">
                      <Icon size={18} className="status-icon-neutral" />
                      <span>{sys.name}</span>
                    </div>
                    <div className={`status-badge status-${sys.status}`}>
                      {sys.status === 'operational' && <><CheckCircle size={14} /> Operativo</>}
                      {sys.status === 'degraded' && <><AlertTriangle size={14} /> Intermitencia</>}
                      {sys.status === 'down' && <><AlertTriangle size={14} /> Caído</>}
                    </div>
                  </div>
                )
              })}
            </div>
            {systemStatus.some(s => s.status !== 'operational') && (
              <div className="status-warning">
                <AlertTriangle size={16} />
                <span>Algunos servicios externos pueden presentar retrasos.</span>
              </div>
            )}
          </section>

          {/* Base de Conocimiento (Enlaces) */}
          <section className="support-card knowledge-card">
            <h2 className="support-card-title">{t('Base de Conocimiento')}</h2>
            <div className="knowledge-links">
              <Link to="/manual" className="knowledge-link">
                <div className="kl-icon"><BookOpen size={24} /></div>
                <div className="kl-content">
                  <h4>Manual de Usuario</h4>
                  <p>Guía paso a paso del portal</p>
                </div>
              </Link>
              <Link to="/seguridad" className="knowledge-link">
                <div className="kl-icon"><ShieldCheck size={24} /></div>
                <div className="kl-content">
                  <h4>Políticas de Seguridad</h4>
                  <p>Normativas de uso y accesos</p>
                </div>
              </Link>
            </div>
          </section>

          {/* Preguntas Frecuentes (Acordeón) */}
          <section className="support-card faq-card">
            <h2 className="support-card-title">{t('Preguntas Frecuentes (FAQ)')}</h2>
            <div className="faq-list">
              {faqs.map(faq => (
                <div 
                  key={faq.id} 
                  className={`faq-item ${openFaq === faq.id ? 'open' : ''}`}
                >
                  <button className="faq-question" onClick={() => toggleFaq(faq.id)}>
                    <div className="faq-q-content">
                      <Info size={18} className="faq-icon" />
                      <span>{faq.q}</span>
                    </div>
                    {openFaq === faq.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </SubPage>
  );
}
