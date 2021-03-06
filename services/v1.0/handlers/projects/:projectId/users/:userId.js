'use strict'

const fp = require('lodash/fp')
const {allowToResetPassword} = require('../../../../../../auth/access')

const translate = model => {
  const user = model.toJSON()
  return fp.omit('auth')(fp.defaults(user.auth)(user))
}

const resetPassword = model =>
  model.auth.updateAttributes({password: 'e10adc3949ba59abbe56e057f20f883e'})

const updateFields = body => model =>
  Promise.all([model.updateAttributes(body), model.auth.updateAttributes(body)])

module.exports = {
  get: async (req, res) => {
    const {projectId, userId} = req.params

    return MySQL.Users.findById(userId, {
      include: [
        {
          model: MySQL.CashAccount,
          as: 'cashAccount',
          attributes: ['balance'],
        },
        {
          model: MySQL.Auth,
          attributes: ['username', 'email', 'mobile'],
        },
      ],
    }).then(translate).then(user => res.send(user),
    ).catch(err => {
      log.error('userId get', err, projectId, userId)
      res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
    })
  },
  put: async (req, res) => {
    const {projectId, userId} = req.params
    if (!allowToResetPassword(req)) {
      return res.send(403, ErrorCode.ack(ErrorCode.NOTSUPPORT,
        {error: 'Only admin and manager can reset password.'}))
    }

    return MySQL.Users.findById(userId, {
      include: [MySQL.Auth],
    }).then(resetPassword).then(() => res.send(ErrorCode.ack(ErrorCode.OK))
    ).catch(err => {
      log.error('userId put',err, projectId, userId)
      res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
    })
  },
  patch: async (req, res) => {
    const {projectId, userId} = req.params

    const fields = fp.pick(['mobile', 'documentId', 'documentType', 'gender', 'name'])(req.body)
    return MySQL.Users.findById(userId, {
      include: [MySQL.Auth],
    }).then(updateFields(fields)).then(() => res.send(ErrorCode.ack(ErrorCode.OK))
    ).catch(err => {
      log.error('userId patch', err, projectId, userId)
      res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC))
    })
  }
}
