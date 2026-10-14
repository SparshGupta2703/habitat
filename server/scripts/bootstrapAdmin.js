import 'dotenv/config'
import dns from 'node:dns'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { timingSafeEqual } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import User from '../models/User.js'

const uri = process.env.MONGO_URI || process.env.MONGODB_URI
const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET
const password = process.env.ADMIN_INITIAL_PASSWORD || 'admin'
const email = (process.env.ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase()

const dnsServers = (process.env.DNS_SERVERS || '').split(',').map((server) => server.trim()).filter(Boolean)
if (dnsServers.length) dns.setServers(dnsServers)

if (!uri) throw new Error('Set MONGO_URI before bootstrapping the administrator.')
if (!bootstrapSecret || bootstrapSecret.length < 32) throw new Error('Set a temporary ADMIN_BOOTSTRAP_SECRET of at least 32 characters.')
if (password !== 'admin' && (password.length < 8 || password.length > 128)) throw new Error('Set ADMIN_INITIAL_PASSWORD to 8–128 characters (or use the requested temporary password `admin`). It will be required to change after first sign-in.')

const readline = createInterface({ input: stdin, output: stdout })
const enteredSecret = await readline.question('Enter ADMIN_BOOTSTRAP_SECRET to continue: ')
readline.close()
const expected = Buffer.from(bootstrapSecret)
const provided = Buffer.from(enteredSecret)
if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new Error('Bootstrap authorization failed.')

try {
  await mongoose.connect(uri)
  const existing = await User.findOne({ email })
  if (existing) {
    if (existing.role !== 'admin') throw new Error('That email already belongs to a non-admin account. No role or password was changed.')
    console.log('Administrator already exists; credentials and role were left unchanged.')
  } else {
    await User.create({ name: 'Administrator', email, password: await bcrypt.hash(password, 10), role: 'admin', mustChangePassword: true })
    console.log('Initial administrator created. Sign in once and set a new password before using admin tools.')
  }
} catch (error) {
  if (error.code === 'ECONNREFUSED' && error.syscall === 'querySrv') {
    throw new Error('MongoDB Atlas SRV lookup was refused by the configured DNS resolver. Try DNS_SERVERS=8.8.8.8,1.1.1.1 in server/.env, verify the cluster is active, or use the non-SRV connection string copied from Atlas.')
  }
  throw error
} finally {
  await mongoose.disconnect()
}
