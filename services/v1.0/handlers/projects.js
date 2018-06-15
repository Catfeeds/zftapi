'use strict'
require('include-node')
const fp = require('lodash/fp')
const {assignNewId} = Include('/services/v1.0/common')

module.exports = {
  post: async (req, res) => {
    const body = req.body
    const Projects = MySQL.Projects
    const Auth = MySQL.Auth
    const FundChannels = MySQL.FundChannels

    if (fp.isEmpty(body.name)) {
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR,
        {error: 'please provide name for creating new project'}))
    }

    if (fp.isEmpty(body.admin)) {
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERERROR,
        {error: 'please provide admin user name for creating new project'}))
    }

    const projectInfo = assignNewId(fp.omit('projectId')(body))

    const guardFields = fp.pick(
      ['name', 'projectId', 'logoUrl', 'address', 'description', 'telephone'])(
      projectInfo)

    const adminUser = t => Auth.create({
      projectId: projectInfo.id,
      username: body.admin,
      password: 'e10adc3949ba59abbe56e057f20f883e',
      level: 'ADMIN',
    }, {transaction: t})

    const allPayments = t => FundChannels.bulkCreate(fp.concat(
      offlinePayments(projectInfo.id), onlinePayments(projectInfo.if)),
    {transaction: t})
    return MySQL.Sequelize.transaction(t =>
      Promise.all(
        fp.flatten([Projects.create(guardFields, {transaction: t}), adminUser(t),
          allPayments(t)]))).
      then(() => res.send(200,
        ErrorCode.ack(ErrorCode.OK, {id: projectInfo.id}))).
      catch(err => res.send(500,
        ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})))
  },
}

const offlinePayments = projectId => fp.map(fp.defaults(
  {flow: 'receive', projectId, category: 'offline', status: 'PASSED'}))(
  [
    {tag: 'cash', name: '现金'},
    {tag: 'card', name: '银行转账'},
    {tag: 'pos', name: 'POS刷卡'},
    {tag: 'other', name: '其他'},
    {tag: 'check', name: '支票'},
    {tag: 'billpay', name: '账扣'},
    {tag: 'reversal', name: '冲正'},
    {tag: 'wechat', name: '微信转账'},
  ])
const onlinePayments = projectId => fp.map(fp.defaults(
  {flow: 'receive', projectId, category: 'online', status: 'PASSED'}))(
  [
    {tag: 'alipay', name: '支付宝'},
    {tag: 'wx', name: '微信'},
  ])

