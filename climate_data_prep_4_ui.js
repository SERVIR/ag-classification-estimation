/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var terraclimate = ee.ImageCollection("IDAHO_EPSCOR/TERRACLIMATE"),
    ERA = ee.ImageCollection("ECMWF/ERA5/DAILY");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// var imageVisParam = {"opacity":1,"bands":["classification"],"min":1,"max":1,"palette":["dee663"]},
//     imageVisParam2 = {"opacity":1,"bands":["classification"],"palette":["fff829"]},
//     NDVI_vis = {"opacity":1,"bands":["NDVI"],"palette":["003702","00600c","008f11","00ca19","00ed1d","00ff1f"]},
//     TemperatureVis = {"min":275,"max":293,"palette":["1a3678","2955bc","5699ff","8dbae9","acd1ff","caebff","e5f9ff","fdffb4","ffe6a2","ffc969","ffa12d","ff7c1f","ca531a","ff0000","ab0000"]},
//     precipitationVis = {"min":0,"max":1000,"palette":["1a3678","2955bc","5699ff","8dbae9","acd1ff","caebff","e5f9ff","fdffb4","ffe6a2","ffc969","ffa12d","ff7c1f","ca531a","ff0000","ab0000"]},
//     soilMoistureVis = {"min":0,"max":2000,"palette":["1a3678","2955bc","5699ff","8dbae9","acd1ff","caebff","e5f9ff","fdffb4","ffe6a2","ffc969","ffa12d","ff7c1f","ca531a","ff0000","ab0000"]},
//     district_stats = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/FinalStats"),
//     consImgList = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap"),
//     imgList = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/yearlyAggregatedRiceMask"),
//     BT2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/renamed_BT_Admin_2"),
//     LS8_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/NDVI_annual"),
//     precip_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Precipitation_annual"),
//     temp_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Temperature_annual"),
//     sm_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/SoilMoisture_annual");

var ROI = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na','Bhutan'));
Map.addLayer(ROI,false) 
////////////////
var BT1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_1")
Map.addLayer(BT1)
print("BT1", BT1)
////////////////

// var soil_moisture09 = terraclimate.filterDate("2009-01-01", "2009-12-31").select("soil").median().clip(ROI)
// var soil_moisture10 = terraclimate.filterDate("2010-01-01", "2010-12-31").select("soil").median().clip(ROI)
// var soil_moisture11 = terraclimate.filterDate("2011-01-01", "2011-12-31").select("soil").median().clip(ROI)
// var soil_moisture12 = terraclimate.filterDate("2012-01-01", "2012-12-31").select("soil").median().clip(ROI)
// var soil_moisture13 = terraclimate.filterDate("2013-01-01", "2013-12-31").select("soil").median().clip(ROI)
// var soil_moisture14 = terraclimate.filterDate("2014-01-01", "2014-12-31").select("soil").median().clip(ROI)
// var soil_moisture15 = terraclimate.filterDate("2015-01-01", "2015-12-31").select("soil").median().clip(ROI)
// var soil_moisture16 = terraclimate.filterDate("2016-01-01", "2016-12-31").select("soil").median().clip(ROI)
// var soil_moisture17 = terraclimate.filterDate("2017-01-01", "2017-12-31").select("soil").median().clip(ROI)
// var soil_moisture18 = terraclimate.filterDate("2018-01-01", "2018-12-31").select("soil").median().clip(ROI)
// var soil_moisture19 = terraclimate.filterDate("2019-01-01", "2019-12-31").select("soil").median().clip(ROI)
// var soil_moisture20 = terraclimate.filterDate("2020-01-01", "2020-12-31").select("soil").median().clip(ROI)
// var soil_moisture21 = terraclimate.filterDate("2021-01-01", "2021-12-31").select("soil").median().clip(ROI)
// var soil_moisture22 = terraclimate.filterDate("2022-01-01", "2022-12-31").select("soil").median().clip(ROI)

// var soil_moisture_rr = soil_moisture09.addBands(soil_moisture10).addBands(soil_moisture11).addBands(soil_moisture12)
//                       .addBands(soil_moisture13).addBands(soil_moisture14).addBands(soil_moisture15).addBands(soil_moisture16)
//                       .addBands(soil_moisture17).addBands(soil_moisture18).addBands(soil_moisture19).addBands(soil_moisture20)
//                       .addBands(soil_moisture21).addBands(soil_moisture22).reduceRegions({collection: ROI, reducer: ee.Reducer.median(),scale:30})

// print("soil_moisture_rr", soil_moisture_rr)
// Export.table.toDrive(soil_moisture_rr, "soil_moisture_rr_ROI")



////////////////////////////


// var soil_moisture09 = terraclimate.filterDate("2009-01-01", "2009-12-31").select("pr").median().clip(ROI)
// var soil_moisture10 = terraclimate.filterDate("2010-01-01", "2010-12-31").select("pr").median().clip(ROI)
// var soil_moisture11 = terraclimate.filterDate("2011-01-01", "2011-12-31").select("pr").median().clip(ROI)
// var soil_moisture12 = terraclimate.filterDate("2012-01-01", "2012-12-31").select("pr").median().clip(ROI)
// var soil_moisture13 = terraclimate.filterDate("2013-01-01", "2013-12-31").select("pr").median().clip(ROI)
// var soil_moisture14 = terraclimate.filterDate("2014-01-01", "2014-12-31").select("pr").median().clip(ROI)
// var soil_moisture15 = terraclimate.filterDate("2015-01-01", "2015-12-31").select("pr").median().clip(ROI)
// var soil_moisture16 = terraclimate.filterDate("2016-01-01", "2016-12-31").select("pr").median().clip(ROI)
// var soil_moisture17 = terraclimate.filterDate("2017-01-01", "2017-12-31").select("pr").median().clip(ROI)
// var soil_moisture18 = terraclimate.filterDate("2018-01-01", "2018-12-31").select("pr").median().clip(ROI)
// var soil_moisture19 = terraclimate.filterDate("2019-01-01", "2019-12-31").select("pr").median().clip(ROI)
// var soil_moisture20 = terraclimate.filterDate("2020-01-01", "2020-12-31").select("pr").median().clip(ROI)
// var soil_moisture21 = terraclimate.filterDate("2021-01-01", "2021-12-31").select("pr").median().clip(ROI)
// var soil_moisture22 = terraclimate.filterDate("2022-01-01", "2022-12-31").select("pr").median().clip(ROI)

// var pr_rr = soil_moisture09.addBands(soil_moisture10).addBands(soil_moisture11).addBands(soil_moisture12)
//                       .addBands(soil_moisture13).addBands(soil_moisture14).addBands(soil_moisture15).addBands(soil_moisture16)
//                       .addBands(soil_moisture17).addBands(soil_moisture18).addBands(soil_moisture19).addBands(soil_moisture20)
//                       .addBands(soil_moisture21).addBands(soil_moisture22).reduceRegions({collection: ROI, reducer: ee.Reducer.median(),scale:30})

// print("pr_rr", pr_rr)
// Export.table.toDrive(pr_rr, "pr_rr_ROI")



////////////////////////////

// var ECMWF = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')

// var soil_moisture09 = ECMWF.filterDate("2009-01-01", "2009-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture10 = ECMWF.filterDate("2010-01-01", "2010-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture11 = ECMWF.filterDate("2011-01-01", "2011-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture12 = ECMWF.filterDate("2012-01-01", "2012-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture13 = ECMWF.filterDate("2013-01-01", "2013-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture14 = ECMWF.filterDate("2014-01-01", "2014-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture15 = ECMWF.filterDate("2015-01-01", "2015-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture16 = ECMWF.filterDate("2016-01-01", "2016-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture17 = ECMWF.filterDate("2017-01-01", "2017-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture18 = ECMWF.filterDate("2018-01-01", "2018-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture19 = ECMWF.filterDate("2019-01-01", "2019-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture20 = ECMWF.filterDate("2020-01-01", "2020-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture21 = ECMWF.filterDate("2021-01-01", "2021-12-31").select("temperature_2m").median().clip(ROI)
// var soil_moisture22 = ECMWF.filterDate("2022-01-01", "2022-12-31").select("temperature_2m").median().clip(ROI)

// var temp_rr = soil_moisture09.addBands(soil_moisture10).addBands(soil_moisture11).addBands(soil_moisture12)
//                       .addBands(soil_moisture13).addBands(soil_moisture14).addBands(soil_moisture15).addBands(soil_moisture16)
//                       .addBands(soil_moisture17).addBands(soil_moisture18).addBands(soil_moisture19).addBands(soil_moisture20)
//                       .addBands(soil_moisture21).addBands(soil_moisture22).reduceRegions({collection: ROI, reducer: ee.Reducer.median(),scale:30})

// print("temp_rr", temp_rr)
// Export.table.toDrive(temp_rr, "temp_rr_ROI")



///////////////////////////////////////



var ls_t2_7 = ee.ImageCollection('LANDSAT/LE07/C02/T2_L2')


///////////////////////////////////////

var ls_t2 = ee.ImageCollection('LANDSAT/LC08/C02/T2_L2')


// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ///Step 3 Apply cloud masking and calculate NDVI on the entire image collection producing a median composite image
function optical_indices(ImageCollection, ROI){

          function maskL8sr(image) {
                  //Bits 3 and 5 are cloud shadow and cloud, respectively.
                var cloudShadowBitMask = (1 << 3);
                var cloudsBitMask = (1 << 5);
                // Get the pixel QA band.
                var qa = image.select('QA_PIXEL');
                // Both flags should be set to zero, indicating clear conditions.
                var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
                              .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
                return image.updateMask(mask);
              }

          var NDVI = ImageCollection.map(maskL8sr).map(function(image) { 
            var conv =  image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
            return  ee.Image(conv.copyProperties(image)).set('system:time_start', image.get('system:time_start')).clip(ROI);//.mosaic()
          })//.median()
          
  return NDVI
}


var NDVI_output = optical_indices(ls_t2,ROI)//.clip(ROI)
Map.addLayer(NDVI_output, {}, 'NDVI_output')
//print("NDVI_output", NDVI_output)

//////
var NDVI_output_7 = optical_indices(ls_t2_7,ROI)//.clip(ROI)
Map.addLayer(NDVI_output, {}, 'NDVI_output')
//print("NDVI_output", NDVI_output)


var soil_moisture09 = NDVI_output_7.filterDate("2009-01-01", "2009-12-31").median().clip(ROI)
var soil_moisture10 = NDVI_output_7.filterDate("2010-01-01", "2010-12-31").median().clip(ROI)
var soil_moisture11 = NDVI_output_7.filterDate("2011-01-01", "2011-12-31").median().clip(ROI)
var soil_moisture12 = NDVI_output_7.filterDate("2012-01-01", "2012-12-31").median().clip(ROI)
var soil_moisture13 = NDVI_output_7.filterDate("2013-01-01", "2013-12-31").median().clip(ROI)
var soil_moisture14 = NDVI_output.filterDate("2014-01-01", "2014-12-31").median().clip(ROI)
var soil_moisture15 = NDVI_output.filterDate("2015-01-01", "2015-12-31").median().clip(ROI)
var soil_moisture16 = NDVI_output.filterDate("2016-01-01", "2016-12-31").median().clip(ROI)
var soil_moisture17 = NDVI_output.filterDate("2017-01-01", "2017-12-31").median().clip(ROI)
var soil_moisture18 = NDVI_output.filterDate("2018-01-01", "2018-12-31").median().clip(ROI)
var soil_moisture19 = NDVI_output.filterDate("2019-01-01", "2019-12-31").median().clip(ROI)
var soil_moisture20 = NDVI_output.filterDate("2020-01-01", "2020-12-31").median().clip(ROI)
var soil_moisture21 = NDVI_output.filterDate("2021-01-01", "2021-12-31").median().clip(ROI)
var soil_moisture22 = NDVI_output.filterDate("2022-01-01", "2022-12-31").median().clip(ROI)

var NDVI_rr = soil_moisture09.addBands(soil_moisture10)
              .addBands(soil_moisture11)
              .addBands(soil_moisture12)
              .addBands(soil_moisture13)
              .addBands(soil_moisture14)
              .addBands(soil_moisture15)
              .addBands(soil_moisture16)
              .addBands(soil_moisture17)
              .addBands(soil_moisture18)
              .addBands(soil_moisture19)
              .addBands(soil_moisture20)
              .addBands(soil_moisture21)
              .addBands(soil_moisture22)
              .reduceRegions({collection: ROI, reducer: ee.Reducer.median(),scale:30})

print("NDVI_rr", NDVI_rr)
Export.table.toDrive(NDVI_rr, "NDVI_rr_ROI")
