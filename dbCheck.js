var level = require('level');
var db = level('points');
var dblines = level('lines')

let jso =
// { type: 'pothole', longitude:77.663669 , latitude:  12.989648}
// { type: 'pothole', longitude:77.663705 , latitude:  12.989679, }
// { type: 'pothole', longitude:  77.662967 , latitude:12.989963}
{ type: 'speedbump', longitude: 77.544907, latitude: 13.069593}

db.put(JSON.stringify(jso), JSON.stringify(jso), function (err) {
    if (err) return console.log('Ooops!', err);
} );



let ok = {
  latitude:13.070142,
  longitude:77.544180,
  type:'ok'
}
dblines.put(JSON.stringify(ok), JSON.stringify(ok), function (err) {
  if (err) return console.log('Ooops!', err);
} );
dblines.createReadStream()
    .on('data', function (data) {
       console.log('libnes',data)

    })
// db.get('hello', function (err, value) {
//     if (err) return console.log('Ooops!', err) // likely the key was not found
 
//     // Ta da!
//     console.log('name=' + value)
//   });

// db.createReadStream()
//   .on('data', function (data) {
//     // console.log( JSON.parse(data.value));
//   })