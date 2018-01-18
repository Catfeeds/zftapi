const flakeId = require('flake-idgen');
const intformat = require('biguint-format');


class SnowFlake
{
    constructor(dataCenter, worker)
    {
        this.flakeIdGen = new flakeId({
            datacenter: dataCenter
            , worker: worker
        });
    }

    next(){
        return intformat(this.flakeIdGen.next(), 'dec');
    }
}

exports.alloc = (dataCenter, worker)=>{
    return new SnowFlake(dataCenter, worker);
};