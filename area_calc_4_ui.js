
var BT1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_1")//.filter('ADM1_EN == "Bumthang" || ' +
                            // 'ADM1_EN == "Chhukha" || ' +
                            // 'ADM1_EN == "Dagana"');
 

// Bumthang
// Chhukha
// Dagana
// Gasa
// Haa
// Lhuntse
// Mongar
// Paro
// Pema Gatshel
// Punakha
// Samdrup Jongkhar
// Samtse
// Sarpang
// Thimphu
// Trashigang
// Trashiyangtse
// Trongsa
// Tsirang
// Wangdue Phodrang
// Zhemgang


Map.addLayer(BT1)
print("BT1", BT1)


var consImgList = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap")
Map.addLayer(consImgList)
print(consImgList)

var rice_15 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2015crm").set("Year", 2015)
var rice_16 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2016crm").set("Year", 2016)
var rice_17 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2017crm").set("Year", 2017)
var rice_18 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2018crm").set("Year", 2018)
var rice_19 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2019crm").set("Year", 2019)
var rice_20 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2020crm").set("Year", 2020)
var rice_21 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2021crm").set("Year", 2021)
var rice_22 = ee.Image("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap/2022crm").set("Year", 2022)


var rice_rr_IC = rice_15
              .addBands(rice_16)
              .addBands(rice_17)
              .addBands(rice_18)
              .addBands(rice_19)
              .addBands(rice_20)
              .addBands(rice_21)
              .addBands(rice_22)
// print('rice_rr_IC', rice_rr_IC)              
var rice_rr = rice_rr_IC.reduceRegions({collection: BT1,
                                        reducer: ee.Reducer.count(),
                                        scale:30})

print("rice_rr", rice_rr)
Export.table.toDrive(rice_rr, "rice_rr")



// var area_calc = function(img, roi){
// // var step1 = img.reduceRegions({collection: roi,
// //                                 reducer: ee.Reducer.median(),
// //                                 scale:30})

//   var reducer = ee.Image(img).reduceRegion({
//     reducer: ee.Reducer.count(),
//     geometry: roi,
//     scale: 30,
//     maxPixels: 1E13
//   });
//   var area = ee.Number(reducer.get('classification')).multiply(30).multiply(30).divide(4047);
//   return area
// }
// var areaout = ee.Number(area_calc(rice_16, BT1))
// print("areaout", areaout)




/////////wroks below

var area_calc = function(img, roi){
  var reducer = ee.Image(img).reduceRegion({
    reducer: ee.Reducer.count(),
    geometry: roi,
    scale: 30,
    maxPixels: 1E13
  });
  var area = ee.Number(reducer.get('classification')).multiply(30).multiply(30).divide(4047);
  return area
}
var areaout = ee.Number(area_calc(rice_16, BT1))
print("areaout", areaout)