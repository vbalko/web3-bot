const Router = require('koa-router')
const router = new Router()
const Ctrl = require('../controllers/root')

router.get('/', Ctrl.hello)

module.exports = router.routes()
