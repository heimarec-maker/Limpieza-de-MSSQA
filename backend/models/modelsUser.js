import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  usuario: { type: String, required: true, index: true },
  nombre: { type: String },
  apellido: { type: String },
  employeeType: { type: String },
  etbDependencia: { type: String },
  numero_identificacion: { type: String },
  tipo_documento: { type: String },
  correo: { type: String, index: true },
  estado: { type: String, default: 'Activo' },
  rol: { type: String, default: 'Usuario' },
  telefono: { type: String },
  movil: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'ADM_usuarios_limpieza' });

UserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Model = mongoose.models.AdmUsuarioLimpieza || mongoose.model('AdmUsuarioLimpieza', UserSchema)
export default Model
