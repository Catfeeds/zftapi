'use strict';
/**
 * Operations on /fundChannels
 */
const fp = require('lodash/fp');

module.exports = {
  /**
     * summary: search available fundChannels
     * description: configure withdraw information

     * parameters: userId
     * produces: application/json
     * responses: 200, 400
     */
  get: (req, res)=>{
    const projectId = req.params.projectId;
    const id = req.params.fundChannelId;

    MySQL.ReceiveChannels.findOne({
      where: {
        fundChannelId: id
      }
      , attributes: ['share', 'setting', 'fee']
      , include: [
        {
          model: MySQL.FundChannels,
          as: 'fundChannel',
          where: {
            projectId: projectId,
            id: id
          }
          , attributes:['id', 'flow', 'projectId', 'category', 'tag', 'name', 'status']
        }
      ]
    }).then(
      channel=>{
        if(!channel){
          return res.send(404, ErrorCode.ack(ErrorCode.DATABASEEXEC));
        }

        channel = channel.toJSON();
        res.send( fp.assign( fp.omit('fundChannel')(channel), channel.fundChannel ) );
      }
    );
  }
};
