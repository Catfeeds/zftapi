'use strict';
/**
 * Operations on /withDraw
 */
const fp = require('lodash/fp');
const moment = require('moment');

module.exports = {
  get: async function(req, res) {
    //get withdraw information
    const projectId = req.params.projectId;

    const query = req.query;
    if(!Util.ParameterCheck(query, ['startDate', 'endDate'])){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED));
    }

    const pagingInfo = Util.PagingInfo(query.index, query.size, true);
    const startDate = moment.unix(query.startDate).toDate();
    const endDate = moment.unix(query.endDate).toDate();

    const status = query.status;
    if(status && !Typedef.WithDrawStatus[status]){
      return res.send(404, ErrorCode.ack(ErrorCode.PARAMETERERROR, {status: status}));
    }

    MySQL.WithDraw.findAndCountAll({
      where:fp.extendAll([
        {
          projectId: projectId
          , createdAt:{$between: [startDate, endDate]}
        }
        , status ? {
          status: status
        }:{}
      ]),
      order:[['updatedAt', 'DESC']],
      offset: pagingInfo.skip,
      limit: pagingInfo.size,
      include: [
        {
          model: MySQL.FundChannels,
          as: 'channel',
          attributes: ['tag', 'name', 'category']
        }
      ]
    }).then(
      result=>{
        const userIds = fp.flatten(
          fp.map(row=>{
            return [row.operator, row.auditor];
          })(result.rows)
        );

        MySQL.Auth.findAll({
          where:{
            id:{$in: userIds}
          },
          attributes:['id', 'userName']
        }).then(
          users=>{
            //
            const userMapping = fp.fromPairs(fp.map(user=>{
              return [user.id, user];
            })(users));

            const data = fp.map(row=>{
              row = row.toJSON();

              const operator = userMapping[row.operator];
              const auditor = userMapping[row.auditor];

              row.operator = operator ? operator : {};
              row.auditor = auditor ? auditor : {};

              row.createdAt = moment(row.createdAt).unix();
              row.updatedAt = moment(row.updatedAt).unix();

              return row;

            })(result.rows);

            res.send({
              paging: {
                count: result.count,
                index: pagingInfo.index,
                size: pagingInfo.size
              },
              data: data
            });
          }
        );
      }
    );
  },
};