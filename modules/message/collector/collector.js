/*
* message queue of api to collector
* */
const messageQueue = Include('/libs/messageQueue');
const config = require('config');

const PRODUCTOR_TOPIC = 'TOCOLLECTOR';
const CONSUMBER_TOPIC = 'TOAPI';

class CollectorMessageQueue{
    constructor(){
        const productorName = `${PRODUCTOR_TOPIC}-${ENV.NODE_ENV}`;
        this.productor = messageQueue.alloc(
            productorName
            , config.MSGQUEUE_HOST
            , config.MSGQUEUE_PORT
            , config.MSGQUEUE_PASSWD
            );
        this.productor.bind(productorName);

        const consumerName = `${CONSUMBER_TOPIC}-${ENV.NODE_ENV}`;
        this.consumer = messageQueue.alloc(
            consumerName
            , config.MSGQUEUE_HOST
            , config.MSGQUEUE_PORT
            , config.MSGQUEUE_PASSWD
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