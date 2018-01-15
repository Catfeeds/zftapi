'use strict';
/**
 * Operations on /contracts/:contractId
 */
const fp = require('lodash/fp');
const _ = require('lodash');
const moment = require('moment');
const assignNewId = require('../../../../common').assignNewId;
const omitSingleNulls = require('../../../../common').omitSingleNulls;
const innerValues = require('../../../../common').innerValues;
const jsonProcess = require('../../../../common').jsonProcess;

const omitFields = item => _.omit(item, ['userId', 'createdAt', 'updatedAt']);
const translate = contract => _.flow(innerValues, omitSingleNulls, omitFields, jsonProcess)(contract);

module.exports = {
	get: function getContract(req, res) {
		const Contracts = MySQL.Contracts;
		const Users = MySQL.Users;
		Contracts.findById(req.params.contractId, {
			include: {model: Users, attributes: ['id', 'name', 'accountName']}
		})
			.then(contract => {
				if (fp.isEmpty(contract)) {
					res.send(404);
					return;
				}
				res.send(translate(contract));
			});
	},
	delete: function (req, res) {
		const Contracts = MySQL.Contracts;
		Contracts.findById(req.params.contractId)
			.then(contract => {
				if (fp.isEmpty(contract)) {
					res.send(404);
					return;
				}
				contract.destroy().then(() => {
					res.send(204);
				})

			})
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	},
	post: function resetContract(req, res, next) {
	},
	put: function operateContract(req, res) {
		const Contracts = MySQL.Contracts;
		const Rooms = MySQL.Rooms;
		const SuspendingRooms = MySQL.SuspendingRooms;
		const contractId = req.params.contractId;
		const projectId = req.params.projectId;
		const status = _.get(req, 'body.status', '').toUpperCase();
		const endDate = _.get(req, 'body.endDate', moment().unix());
		const roomStatus = _.get(req, 'body.roomStatus', Typedef.OperationStatus.IDLE).toUpperCase();

		if (status !== Typedef.ContractStatus.TERMINATED) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {
				status,
				allowedStatus: [Typedef.ContractStatus.TERMINATED]
			}));
		}
		const allowedStatus = [Typedef.OperationStatus.IDLE,
			Typedef.OperationStatus.PAUSED];
		if (!_.includes(allowedStatus, roomStatus)) {
			return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {roomStatus, allowedStatus}));
		}

		const Sequelize = MySQL.Sequelize;

		return Contracts.findById(contractId, {include: [{model: Rooms, required: true}]})
			.then(contract => {
				if (fp.isEmpty(contract)) {
					res.send(404);
					return;
				}
				console.log('room', contract.dataValues.room);
				//TODO: record a new flow {billFlow: {dueAmount: 9900, paymentMethod: cash, operator: 312}}

				return Sequelize.transaction(t => {
					const contractUpdating = contract.update({
						to: endDate,
						status
					}, {transaction: t});
					const suspending = assignNewId({
						projectId,
						from: endDate + 1,
						roomId: contract.dataValues.room.id
					});
					const operations = Typedef.OperationStatus.PAUSED === roomStatus ? [
						contractUpdating,
						SuspendingRooms.create(suspending, {transaction: t})
					] : [contractUpdating];
					return Promise.all(operations);
				})
			}).then((updated, room) => res.send(updated))
			.catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
	}
};
