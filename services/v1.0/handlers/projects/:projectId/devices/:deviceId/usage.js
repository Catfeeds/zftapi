'use strict';
const fp = require('lodash/fp');
const moment = require('moment');
const {formatMysqlDateTime} = Include('/services/v1.0/common');

const innerData = a => a.toJSON();

const formatFields = usage => {
    const {endScale: eso, startScale: sso} = usage;
    const startScale = Number(sso * 10000).toFixed(0);
    const endScale = Number(eso * 10000).toFixed(0);
    return {
        startScale,
        endScale,
        usage: endScale - startScale,
        time: moment(usage.time).unix(),
    };
};

const translate = data => fp.map(fp.pipe(
    innerData,
    formatFields,
))(data);

module.exports = {
    get: async (req, res) => {
        const projectId = req.params.projectId;
        const deviceId = req.params.deviceId;

        if (!Util.ParameterCheck(req.query, ['startDate', 'endDate'])) {
            return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
        }

        const startDate = moment.unix(req.query.startDate).
            subtract(1, 'days').
            unix();
        const endDate = req.query.endDate;

        await MySQL.DeviceHeartbeats.findAll(
            {
                attributes: [
                    'deviceId',
                    [
                        MySQL.Sequelize.fn('DATE_FORMAT',
                            MySQL.Sequelize.col('createdAt'),
                            '%Y-%m-%d %H:00:00'),
                        'time'],
                    [
                        MySQL.Sequelize.fn('max',
                            MySQL.Sequelize.col('total')),
                        'endScale'],
                    [
                        MySQL.Sequelize.fn('min',
                            MySQL.Sequelize.col('total')),
                        'startScale']],
                group: [
                    'deviceId',
                    MySQL.Sequelize.fn('DATE_FORMAT',
                        MySQL.Sequelize.col('createdAt'), '%Y-%m-%d %H:00:00')],
                where: {
                    deviceId,
                    createdAt: {
                        $gte: formatMysqlDateTime(startDate),
                        $lte: formatMysqlDateTime(endDate),
                    },
                },
            },
        ).then(translate).then(data => res.send(data)).catch(
            err => {
                log.error(err, projectId, deviceId, startDate, endDate);
                res.send(500, ErrorCode.ack(ErrorCode.DATABASEEXEC));
            },
        );
    },
};
