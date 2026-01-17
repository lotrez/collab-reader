import { Hono } from 'hono'
import epub from './services/epub'

const app = new Hono()
app.route('/epub', epub)

export default app