'use strict'
const fp = require('lodash/fp')
/**
 * Operations on /houses/format
 */

const translate = fp.map(res => {
  const position = res.location && res.location.split(',') || [0,0]
  return {
    name: res.name,
    district: res.district,
    address: res.address,
    divisionId: res.adcode,
    code: res.id,
    longitude: position[0],
    latitude: position[1],
  }
})
const whichHasId = fp.filter(location => !fp.isEmpty(location.id))

module.exports = {
  /**
     * summary: get house locations
     * description: pass hid or query parameter to get houese list

     * parameters: key
     * produces: application/json
     * responses: 200, 400
     */
  get: async (req, res)=>{
    /**
         * Get the data for response 200
         * For response `default` status 200 is used.
         */
    const param = req.query
    if(!Util.ParameterCheck(param,
      ['city', 'q']
    )){
      return res.send(422, ErrorCode.ack(ErrorCode.PARAMETERMISSED))
    }

    const query = {
      keywords: decodeURIComponent(param.q),
      city: param.city
    }
    return Amap.InputTips(query).then(
      data=>{
        res.send((translate(whichHasId(data))))
      },
      err=>{
        log.error(err, query)
        res.send(500, ErrorCode.ack(ErrorCode.UNKNOWN))
      }
    )
  }
}
