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
        const id = req.params.id;

        MySQL.WithDraw.findOne({
            where:{
                projectId: projectId
                , id: id
            }
        }).then(
            row=>{
                if(!row){
                    return res.send(404, ErrorCode.ack(ErrorCode.REQUESTUNMATCH));
                }

                row = row.toJSON();
                const userIds = [row.operator, row.auditor];

                MySQL.Users.findAll({
                    where:{
                        id:{$in: userIds}
                    },
                    attributes:['id', 'accountName', 'name']
                }).then(
                    users=>{
                        //
                        const userMapping = fp.fromPairs(fp.map(user=>{
                            return [user.id, user];
                        })(users));

                        const operator = userMapping[row.operator];
                        const auditor = userMapping[row.auditor];

                        row.operator = operator ? operator : {};
                        row.auditor = auditor ? auditor : {};

                        row.createdAt = moment(row.createdAt).unix();
                        row.updatedAt = moment(row.updatedAt).unix();

                        res.send(row);
                    }
                );
            }
        );
    },
};
