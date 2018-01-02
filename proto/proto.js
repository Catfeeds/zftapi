const grpc = require('grpc');
const config = require('config');
const path = require('path');
const _ = require('lodash');

//load proto file
function LoadProto(filename, packageName) {
	const filePath = path.join(__dirname, filename);
	return grpc.load(filePath)[packageName];
}
function CreateClient(rpcAddress, packageIns, serviceName) {
    try{
        return new packageIns[serviceName](rpcAddress, grpc.credentials.createInsecure());
	}
	catch(e){
    	log.error(e, rpcAddress);
	}
}

class RPCClient {
	constructor(rpcAddress, proto, pkg, service) {
		this.rpcAddress = rpcAddress;
		this.proto = proto;
		this.pkg = pkg;
		this.service = service;
		this.client = null;
	}

	create () {
		this.client = CreateClient(this.rpcAddress, LoadProto(this.proto, this.pkg), this.service);
		return this.client;
	}

    run (func, obj) {
		let _this = this;
        return new Promise((resolve, reject)=>{
        	if(!_this.client){
        		return reject(ErrorCode.ack(ErrorCode.Code.ACCESSDENIED));
			}
            try {
                _this.client[func](obj, function (err, response) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        if(response.result.length) {
                            let result = null;
                            try {
                                result = JSON.parse(response.result);
                            }
                            catch (e) {
                            }
                            response.result = result;
                        }
                        else{
                        	response = _.omit(response, 'result');
						}
                        resolve(response);
                    }
                });
            }
            catch(e){
                log.error(e, this.rpcAddress, this.proto, this.pkg, this.service, obj);
            }
        });
    }
}

class RPCPool {
	constructor(){
		this.pool = {};
	}
	create (alias, rpcAddress, proto, pkg, service){
		if(this.pool[alias]){
			return this.pool[alias];
		}
        let client = new RPCClient(rpcAddress, proto, pkg, service);
        client.create();
		this.pool[alias] = client;
		return client;
	}
	get (alias) {
		return this.pool[alias];
	}
}
let pool = new RPCPool();

//建立RPC服务
exports = module.exports = function(){
	//Finance
	global.RPC = {
		Finance:{
			Cash:{
				Flush: (obj)=>{ return pool.get(CASH).run('flush', obj); }
			}
		},
	};

	const CASH = 'CASH';
    pool.create(CASH, config.RPC_FINANCE, 'finance.proto', 'Finance', 'Cash');
};
