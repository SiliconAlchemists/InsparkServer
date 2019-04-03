const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const enableWs = require('express-ws');
var level = require('level');
var db = level('points');
var dblines = level('lines')
const app = express();
enableWs(app);
app.use(bodyParser.json());
app.use(cors());


let center = {
    latitude:13.069593,
    longitude: 77.544807
}
let gyroData = [];
let getGyroInterval = null;
let getLocationInterval = null;
let predictorInterval = null;
let gyroRequest={
  action:'gyro'
}
let locationRequest={
  action:'location'
}

let markerSend = (ws) =>{
    markers=[];
    db.createReadStream()
.on('data', function (data) {
 // console.log('markers',(JSON.parse(data.value).type) );
 let marker = JSON.parse(data.value);
// let obj = {
// type:data.value.type,
// longitude:data.value.longitude,
// latitude:data.value.latitude
// }
markers.push(marker);

}).on('end', function () {
    let obj ={
        action:'getMarkers',
        markers:markers
    }
if(ws.readyState != ws.CLOSED){
    ws.send(JSON.stringify(obj));
    // console.log('sending', obj);
}
})
}

let centerSend = (ws)=>{
  // console.log('sending center:', center);
    let obj = {
        action:'getCenter',
        center:center
    }
    if(ws.readyState != ws.CLOSED){
        ws.send(JSON.stringify(obj));
    // console.log('send center', obj);
    }

}

let linesSend = (ws) =>{
    lines=[];
    dblines.createReadStream()
.on('data', function (data) {
 // console.log('lines',(JSON.parse(data.value).type) );
 let line = JSON.parse(data.value);

lines.push(line);

}).on('end', function () {
    let obj ={
        action:'getLines',
        lines:lines
    }
if(ws.readyState != ws.CLOSED){
    ws.send(JSON.stringify(obj));
    // console.log('sending', obj);
}
})
}

app.ws('/webportal', (ws, req) => {

    ws.on('message', msg => {

        let webObj = JSON.parse(msg);
        if(webObj.action == 'getMarkers'){
            markerSend(ws);

            setInterval(() =>{
               markerSend(ws);
                },10000);
        } else if(webObj.action =='getCenter'){
            centerSend(ws);
            setInterval(() =>{
                centerSend(ws);
                 },10000);
        } else if(webObj.action =='getLines'){
            linesSend(ws);
            setInterval(() =>{
                centerSend(ws);
                 },10000);
        }

    })

    ws.on('close', () => {
        console.log('WebSocket webportal was closed');
    })

})

app.ws('/lookout', (ws, req) => {

    ws.on('message', msg => {

        let appObj = JSON.parse(msg);
        if(appObj.action == 'feedback'){
            let hazard = {
              type:appObj.type,
              latitude:appObj.latitude,
              longitude:appObj.longitude
            }
            db.put(JSON.stringify(hazard), JSON.stringify(hazard), function (err) {
                if (err) return console.log('Ooops!', err);
            } );

            // console.log(hazard.type);
        } else if(appObj.action =='start'){
          console.log('starting');

            getGyroInterval = setInterval( ()=>{
              if(ws.readyState != ws.CLOSED){
                ws.send(JSON.stringify(gyroRequest));
                // console.log('asking data');
              }
            },100);

            getLocationInterval = setInterval( ()=>{
              if(ws.readyState != ws.CLOSED){
                ws.send(JSON.stringify(locationRequest));
                // console.log('asking data');
              }
            },5000);
        } else if(appObj.action =='gyro'){
            let {x,y,z} = appObj;
            let magnitude =  Math.sqrt( x*x +y*y + z*z);
            gyroData.push(magnitude);
        }else if(appObj.action =='location'){
             let {latitude,longitude} = appObj;
             center.latitude = latitude;
             center.longitude = longitude;
             let LineCoordinate = {
               latitude:latitude,
               longitude:longitude,
               type:'ok'
             }
             dblines.put(JSON.stringify(LineCoordinate), JSON.stringify(LineCoordinate), function (err) {
               if (err) return console.log('Ooops!', err);
             } );
        }

    })

    ws.on('close', () => {
        console.log('WebSocket lookout was closed');
        clearInterval(getGyroInterval);
        clearInterval(getLocationInterval);
        getGyroInterval = null;
        getLocationInterval = null;
    })

})


let sendGyroData = (ws)=>{
  if(gyroData.length>300){
    gyroData = gyroData.slice(gyroData.length-60, gyroData.length);
  };
  let sendObj ={
    data: gyroData.slice(gyroData.length-30, gyroData.length)
  }
  if(gyroData.length>=30){
    if(ws.readyState != ws.CLOSED){
      ws.send(JSON.stringify(sendObj));
    }

  }
}
app.ws('/predictor', (ws, req) => {

    ws.on('message', msg => {

        let predObj = JSON.parse(msg);
        if(predObj.action == 'ready'){
            predictorInterval =setInterval(()=>{
              sendGyroData(ws);
            },1000 );
        } else if(predObj.action =='prediction'){
            let {prediction} = predObj;
            console.log('prediction:  ',prediction);
        }
    })

    ws.on('close', () => {
        console.log('WebSocket predictor was closed');
        clearInterval(predictorInterval);
        predictorInterval = null;
    })

})


app.listen(process.env.PORT || 3006, () => {
    console.log(`Hello Gang, Websockets Server Running on PORT ${process.env.PORT||3006}`);
})
