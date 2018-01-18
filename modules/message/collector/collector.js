/*
* message queue of api to collector
* */
const messageQueue = Include('/libs/messageQueue');
const config = require('config');

const PRODUCTOR_TOPIC = 'TOCOLLECTOR';
const CONSUMBER_TOPIC = 'TOAPI';

class CollectorMessageQueue{
    constructor(){
        const productorName = `${PRODUCTOR_TOPIC}_${ENV.ENV}`;
        this.productor = messageQueue.alloc(
            productorName
            , config.REDIS_HOST
            , config.REDIS_PORT
            , config.REDIS_PASSWD
            );
        this.productor.bind(productorName);

        const consumerName = `${CONSUMBER_TOPIC}_${ENV.ENV}`;
        this.consumer = messageQueue.alloc(
            consumerName
            , config.REDIS_HOST
            , config.REDIS_PORT
            , config.REDIS_PASSWD
        );
        this.consumer.listen(consumerName);
    }

    send(message){
        if(this.productor){
            this.productor.publish(message);
        }
    }

    register(func){
        if(!this.consumer){
            return false;
        }
        return this.consumer.register(func);
    }

    unRegister(index){
        if(!this.consumer){
            return false;
        }
        return this.consumer.unRegister(index);
    }
}

exports.alloc = ()=>{
    return new CollectorMessageQueue();
};

exports.moduleName = 'Collector';