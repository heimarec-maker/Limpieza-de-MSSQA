import 'dotenv/config'
import mongoose from 'mongoose'

const { MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_DB, MONGO_AUTH_DB } = process.env

const uri = `mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:27017/${MONGO_DB}?authSource=${MONGO_AUTH_DB}`

async function connectMongo() {
  try {
    await mongoose.connect(uri)
    console.log('Conexión exitosa a MongoDB')
  } catch (error) {
    console.log('Error en la conexión a MongoDB:', error)
  }
}

connectMongo()
