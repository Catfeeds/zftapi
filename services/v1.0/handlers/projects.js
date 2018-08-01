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
    const ReceiveChannels = MySQL.ReceiveChannels

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
      [
        'id',
        'name',
        'projectId',
        'logoUrl',
        'address',
        'description',
        'telephone'])(
      projectInfo)

    const adminUser = t => Auth.create({
      projectId: projectInfo.id,
      username: body.admin,
      password: 'e10adc3949ba59abbe56e057f20f883e',
      level: 'ADMIN',
    }, {transaction: t})

    const allPayments = async t => {
      const onlineChannels = onlinePayments(projectInfo.id)
      const offlineChannels = offlinePayments(projectInfo.id)
      const fundChannelCreating = fp.map(
        f => FundChannels.create(f, {transaction: t}))(
        fp.flatten([
          offlineChannels,
          onlineChannels]))
      const receiveChannelCreating = fp.map(
        f => ReceiveChannels.create(f, {transaction: t}))(fp.flatten([
        receiveChannels(offlineChannels),
        receiveChannels(onlineChannels)]))
      return Promise.all(
        fp.flatten([fundChannelCreating, receiveChannelCreating]))
    }
    return MySQL.Sequelize.transaction(t =>
      Promise.all(
        fp.flatten([
          Projects.create(guardFields, {transaction: t}), adminUser(t),
          allPayments(t)]))).
      then(() => res.send(200,
        ErrorCode.ack(ErrorCode.OK, {id: projectInfo.id}))).
      catch(err => res.send(500,
        ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})))
  },
}

const offlinePayments = projectId => fp.map(fp.pipe(fp.defaults(
  {flow: 'receive', projectId, category: 'offline', status: 'PASSED'}),
assignNewId))(
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
const onlinePayments = projectId => fp.map(fp.pipe(fp.defaults(
  {flow: 'receive', projectId, category: 'online', status: 'PASSED'}),
assignNewId))(
  [
    {tag: 'alipay', name: '支付宝'},
    {tag: 'wx', name: '微信'},
  ])

//TODO: this is required to enable online payments, fix this in BOSS creating project function
const receiveChannels = fp.map(
  c => ({id: c.id, fundChannelId: c.id, fee: 0}))

