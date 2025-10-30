import dotenv from 'dotenv'
import mongoose from 'mongoose'

// load the backend/.env specifically (MONGO_URI is stored there)
dotenv.config({ path: './backend/.env' })

const uri = process.env.MONGO_URI
if (!uri) {
  console.error('MONGO_URI not set in backend/.env')
  process.exit(1)
}

console.log('Attempting to connect to MongoDB using URI from backend/.env')

async function run() {
  try {
    await mongoose.connect(uri, { dbName: 'chromamind', serverSelectionTimeoutMS: 5000 })
    console.log('Connected to MongoDB (test script)')
    await mongoose.connection.close()
    process.exit(0)
  } catch (err) {
    console.error('Mongo connection failed:')
    console.error(err && (err.stack || err.message || err))
    process.exit(1)
  }
}

run()
