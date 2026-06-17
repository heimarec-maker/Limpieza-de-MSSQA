/**
 * backend/index.js — Punto de entrada del servidor
 */
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import * as db from './config/db.js'
import apiRoutes from './routes/apiRoutes.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Inicializar base de datos Oracle
db.initDB().catch(err => {
  console.error('⚠️ No se pudo iniciar el pool de Oracle:', err.message)
})

// Rutas de la API
app.use('/api', apiRoutes)

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Backend corriendo en http://localhost:${PORT}`)
  console.log(`   📂 Estructura organizada por: Config, Routes, Services`)
  console.log(`   📦 Conexión: ${process.env.DB_CONNECTION_STRING}\n`)
})
