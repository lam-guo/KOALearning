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
  const start = new Date;
  let i =0;
  let list = [];
  while(i<500000){
    let ran = Math.random()*1000000;
    list.push(md5(ran))
    i++
  }
  console.log(new Date - start )
  await client.saddAsync('hashSet',list)
  console.log(new Date - start )
});




router.post('/result', async(ctx,next)=>{
  const param = ctx.request.body;
  const size = param.size?param.size:500000;
  let i =0;
  let testData = [];
  const start = new Date;
  while(i<size){
    let ran = Math.random()*1000000;
    testData.push(md5(ran))
    i++
  }
  await client.saddAsync('hashSet',testData)
  await client.delAsync('data');
  const result = await client.smembersAsync("hashSet");
  const slice = param.slice>result.size ? result.size : param.slice;
  await client.pfaddAsync('data',result.slice(0,slice));
  console.log(`size of the result: ${size}`);
  const pfcount = await client.pfcountAsync('data');
  console.log(`size of the hllResult: ${pfcount}`);
  let miss = (pfcount-slice)*100/slice+'%'
  console.log('误差率:'+miss+'%')
  ctx.body = {'result':size,'pfcount':pfcount,'miss':miss}
  await client.delAsync('hashSet')
});


router.post('/resultTest', async(ctx,next)=>{
  const param = ctx.request.body;
  const size = param.size?param.size:500000;
  let i =0;
  let testData = new Set();
  const start = new Date;
  while(i<size){
    let ran = Math.random()*1000000;
    testData.add(i)
    testData.add(md5(ran))
    i++
  }
  console.log(new Date - start+'ms:set')

  let hashValue = Array.from(testData);
  await client.hmsetAsync('hash key', hashValue);
  console.log(new Date - start+'ms:hmset')

  const slice = param.slice>hashValue.size ? hashValue.size : param.slice;
  await client.delAsync('data');

  const result = await client.hvalsAsync("hash key");
  console.log(new Date - start+'ms:hvals')

  const keys = slice? Object.keys(result).slice(0,slice) : Object.keys(result);
  let list = [];

  keys.map((key=>{
    list.push(result[key])
  }));
  console.log(new Date - start+'ms:map')
  await client.pfaddAsync('data',list);
  console.log(`size of the result: ${size}`);
  console.log(`size of the actualResult:${slice}`);
  const pfcount = await client.pfcountAsync('data');
  console.log(`size of the hllResult: ${pfcount}`);
  let miss = (pfcount-slice)*100/slice+'%'
  console.log('误差率:'+miss+'%')
  ctx.body = {'result':size,'actualResult':slice,'pfcount':pfcount,'miss':miss}
});

async function test(size,slice){
  let i =0;
  let testData = [];
  const start = new Date;
  while(i<size){
    let ran = Math.random()*1000000;
    testData.push(md5(ran))
    i++
  }
  await client.saddAsync('hashSet',testData)
  await client.delAsync('data');
  const result = await client.smembersAsync("hashSet");
  const sliceLong = slice>result.length ? result.length : slice;
  await client.pfaddAsync('data',result.slice(0,sliceLong));
  console.log(`size of the result: ${size}`);
  const pfcount = await client.pfcountAsync('data');
  console.log(`size of the hllResult: ${pfcount}`);
  let miss = (pfcount-sliceLong)*100/sliceLong+'%'
  console.log('误差率:'+miss+'%')
  await client.delAsync('hashSet')
  return {'result':size,'pfcount':pfcount,'miss':miss}
}

router.post('/function', async(ctx)=> {
  const param = ctx.request.body;
  const size = param.size?param.size:500000;
  const slice = param.slice;
  let times = param.times || 1;
  let result = []
  while(times>0){
    const rs = await test(size,slice);
    result.push(rs);
    times--;
  }
 
  ctx.body = result;
});
module.exports = router;
