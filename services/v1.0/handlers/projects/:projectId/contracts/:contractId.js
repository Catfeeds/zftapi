'use strict';
/**
 * Operations on /contracts/:contractId
 */
const fp = require('lodash/fp');
const assignNewId = require('../../../../common').assignNewId;
const omitSingleNulls = require('../../../../common').omitSingleNulls;
const innerValues = require('../../../../common').innerValues;
const jsonProcess = require('../../../../common').jsonProcess;
const finalBillOf = require('../../../../../../transformers/billGenerator').finalBill;
const finalPaymentOf = require('../../../../../../transformers/paymentGenerator').finalPayment;

const omitFields = fp.omit(['userId', 'createdAt', 'updatedAt']);
const translate = contract => fp.pipe(innerValues, omitSingleNulls, omitFields, jsonProcess)(contract);

module.exports = {
    get: function getContract(req, res) {
        const Contracts = MySQL.Contracts;
        const Users = MySQL.Users;
        Contracts.findById(req.params.contractId, {
            include: [Users]
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
                });
            })
            .catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    },
    put: function operateContract(req, res) {
        const Contracts = MySQL.Contracts;
        const Rooms = MySQL.Rooms;
        const SuspendingRooms = MySQL.SuspendingRooms;
        const Bills = MySQL.Bills;
        const Flows = MySQL.Flows;
        const BillPayment = MySQL.BillPayment;
        const contractId = req.params.contractId;
        const projectId = req.params.projectId;
        const status = fp.getOr('')('body.status')(req).toUpperCase();
        const endDate = fp.get('body.endDate')(req);
        const roomStatus = fp.getOr(Typedef.OperationStatus.IDLE)('body.roomStatus')(req).toUpperCase();

        if (status !== Typedef.ContractStatus.TERMINATED) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {
                status,
                allowedStatus: [Typedef.ContractStatus.TERMINATED]
            }));
        }

        if (status !== Typedef.ContractStatus.TERMINATED) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {
                status,
                allowedStatus: [Typedef.ContractStatus.TERMINATED]
            }));
        }
        const allowedStatus = [Typedef.OperationStatus.IDLE,
            Typedef.OperationStatus.PAUSED];
        if (!fp.includes(roomStatus)(allowedStatus)) {
            return res.send(400, ErrorCode.ack(ErrorCode.PARAMETERERROR, {roomStatus, allowedStatus}));
        }

        const Sequelize = MySQL.Sequelize;

        return Contracts.findById(contractId, {include: [{model: Rooms, required: true}]})
            .then(contract => {
                if (fp.isEmpty(contract)) {
                    res.send(404);
                    return;
                }

                return Sequelize.transaction(t => {
                    const actualEndDate = fp.isUndefined(endDate) ? contract.to : endDate;
                    const contractUpdating = contract.update({
                        actualEndDate,
                        status
                    }, {transaction: t});
                    const suspending = assignNewId({
                        projectId,
                        from: actualEndDate + 1,
                        roomId: contract.dataValues.room.id
                    });

                    const settlement = fp.defaults(fp.get('body.transaction')(req))({projectId, contractId});
                    const newBill = finalBillOf(settlement);
                    const finalBillPromise = Bills.create(newBill, {transaction: t});
                    const operatorId = req.isAuthenticated() && req.user.id;

                    const finalFlow = assignNewId({projectId, category: 'final'});
                    const finalFlowPromise = Flows.create(finalFlow, {transaction: t});

                    const finalPayment = finalPaymentOf(fp.defaults(settlement)({
                        billId: newBill.id,
                        operatorId,
                        flowId: finalFlow.id
                    }));
                    const finalPaymentPromise = BillPayment.create(finalPayment, {transaction: t});

                    const operations = Typedef.OperationStatus.PAUSED === roomStatus ? [
                        SuspendingRooms.create(suspending, {transaction: t})
                    ] : [];

                    return Promise.all(fp.concat(
                        operations, [contractUpdating, finalBillPromise, finalPaymentPromise, finalFlowPromise]
                    ));
                });
            }).then(updated => res.send(fp.get('[1]')(updated)))
            .catch(err => res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC, {error: err.message})));
    }
};
