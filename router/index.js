const router = require('koa-router')();
const randomstr = require('randomstring');
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
  while(i<100000){
    let ran = randomstr.generate(3)
    // list.push(client.hsetAsync("hash key", i,ran));
    i++
    list.push(ran)
  }

  const promises = list.map((v,i)=>{client.hsetAsync("hash key",i,v)})
  const mss = new Date - start;
  console.log('%s %s - %s', this.method, this.url, mss);
 
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
router.get('/setSameValue', function *(next) {
  for(let i=0;i<=1000;i++){
    client.hmset("hash key",i+70000,'5f97AXF69U34',i+80000,'bMLISvd0Y4E0',i+90000,'whGcxFvOIfW0');
  }
 
});

module.exports = router;
