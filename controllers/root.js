function hello (ctx) {
    let user = ctx.request.query.user || 'nothing';
    ctx.ok({ user })
  }
  
  module.exports = {
    hello
  }
  