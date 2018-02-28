const router = require('koa-router')();
const randomstr = require('randomstring');
const md5 = require('md5')
var redis = require('redis');
const bluebird =require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();
client.on("error", function (err) {
  console.log("Error " + err);
});


router.get('/', async(ctx)=> {
  await client.delAsync('data').then((rs)=>{console.log(rs)});
  const start = new Date;
  let i =0;
  let list = [];
  while(i<500000){
    let ran = Math.random()*1000000;
    list.push(i)
    list.push(md5(ran))
    i++
  }
  await client.hmsetAsync('hash key',list).then((rs)=>{
    console.log(rs)
  })
 
});



router.get('/result/:slice', async(ctx,next)=>{
  const param = ctx.params;
  const slice = param.slice || 0;
  await client.delAsync('data').then((rs)=>{console.log(rs)});

  const actualResult = new Set();
  client.hgetall("hash key",(err,result)=>{
    const keys = slice? Object.keys(result).slice(0,slice) : Object.keys(result);
    keys.map((key=>{
      actualResult.add(result[key]);
    }))
    const allSize = keys.length;
    for(let i=0;i<=allSize;i++){
      client.pfadd('data',result[i]);
    }
    console.log(`size of the result: ${allSize}`);
    console.log(`size of the acturalResult:${actualResult.size}`);
  })
});

router.get('/getCount', async(ctx)=>{
  client.pfcount('data',redis.print);
});


module.exports = router;
