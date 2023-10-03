var imageVisParam = {"opacity":1,"bands":["classification"],"min":1,"max":1,"palette":["dee663"]},
    imageVisParam2 = {"opacity":1,"bands":["classification"],"palette":["fff829"]},
    NDVI_vis = {"opacity":1,"bands":["NDVI"],"palette":["003702","00600c","008f11","00ca19","00ed1d","00ff1f"]},
    TemperatureVis = {"min":275,"max":293,"palette":["1a3678","2955bc","5699ff","8dbae9","acd1ff","caebff","e5f9ff","fdffb4","ffe6a2","ffc969","ffa12d","ff7c1f","ca531a","ff0000","ab0000"]},
    precipitationVis = {"min":0,"max":1000,"palette":["1a3678","2955bc","5699ff","8dbae9","acd1ff","caebff","e5f9ff","fdffb4","ffe6a2","ffc969","ffa12d","ff7c1f","ca531a","ff0000","ab0000"]},
    soilMoistureVis = {"min":0,"max":2000,"palette":["1a3678","2955bc","5699ff","8dbae9","acd1ff","caebff","e5f9ff","fdffb4","ffe6a2","ffc969","ffa12d","ff7c1f","ca531a","ff0000","ab0000"]},
    district_stats = ee.FeatureCollection("projects/servir-sco-assets/assets/District_Stats_10_3"),
    consImgList = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/YearlyConsistentRiceMap"),
    imgList = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/yearlyAggregatedRiceMask"),
    BT2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/renamed_BT_Admin_2"),
    LS8_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/NDVI_annual"),
    precip_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Precipitation_annual"),
    temp_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Temperature_annual"),
    sm_annual_collection = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/SoilMoisture_annual"),
    BT2 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_2"),
    BT1 = ee.FeatureCollection("projects/servir-sco-assets/assets/Bhutan/BT_Admin_1");


imgList= ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Predicted_Rice_Post_Processed_IC");
print("imgList",imgList)
// Selecting the region of interest
 
var mapPanel = ui.Map();

// Take all tools off the map except the zoom and mapTypeControl tools.
mapPanel.setControlVisibility(
    {all: false, zoomControl: true, mapTypeControl: true});


var ROI = BT1;

var ROI_ml = ui.Map.Layer(ROI, {}, "ROI")
mapPanel.add(ROI_ml);
var dist = "All Dzongkhags"
var Districts = district_stats.aggregate_array('Dzongkhag').distinct().sort();
Map.addLayer(ROI)

// Center the map

var roi_cent = ROI.geometry().centroid().coordinates()
mapPanel.setCenter(roi_cent.get(0).getInfo(),roi_cent.get(1).getInfo(), 9);

// Add these to the interface.
ui.root.widgets().reset([mapPanel]);

imgList = imgList.sort('system:time_start').toList(imgList.size());
print("imgList 2", imgList)
consImgList = consImgList.sort('system:time_start').toList(consImgList.size());
LS8_annual_collection = LS8_annual_collection.toList(LS8_annual_collection.size());
precip_annual_collection = precip_annual_collection.toList(precip_annual_collection.size());
temp_annual_collection = temp_annual_collection.toList(temp_annual_collection.size());
sm_annual_collection = sm_annual_collection.toList(sm_annual_collection.size());
//////////////
////
////  Display     https://github.com/gee-community/ee-palettes
////
////////////// 
var palettes = require('users/gena/packages:palettes');
var palette0 = palettes.misc.tol_rainbow[7];
var palette1 = palettes.colorbrewer.Oranges[3]
var palette2 = palettes.kovesi.diverging_bwr_40_95_c42[7];
var palette3 = palettes.crameri.roma[50];
var palette4 = palettes.colorbrewer.Greys[9];
var palette5 = palettes.cmocean.Tempo[7];

//////////////////Add Panel

var panel = ui.Panel({style: {width:'20%'}});
var intro = ui.Panel([
  ui.Label('ACES: Agricultural Classification and Estimation Service',{fontWeight: 'bold', fontSize: '18px', margin: '7px 5px'}),
  ui.Label('This GUI visualizes annual rice crop masks generated using a Random Forest model from GEE.',{fontWeight: 'bold',margin: '10px 7px'}),
  ui.Label('To get rice stats, first choose your region of interest. By default, the region is whole of Bhutan.',{margin: '10px 7px'}),
  // ui.Label(''),
]);
panel.add(intro);

ui.root.add(panel);
//////////////////////////////////////////////////////////////////////////////

// Set up placeholder time
var years = ["2016","2017","2018","2019","2020","2021","2022"];
var num_years = [2016,2017,2018,2019,2020,2021,2022];
var year = "2016"; // "2020"
var yr_idx = years.indexOf(year);
print('yr_idx', yr_idx)
print(yr_idx)


var annual_NDVI = 0;
var curr_NDVI = 0;
var NDVI_chart = 0;
var annual_precip = 0;
var curr_precip = 0;
var precip_chart = 0;
var annual_sm = 0;
var curr_sm = 0;
var sm_chart = 0;
var annual_temp = 0;
var curr_temp = 0;
var temp_chart = 0;

function get_med(yr,prop_name){
  var median = district_stats.filter(ee.Filter.eq('Year', yr)).filter(ee.Filter.eq('Dzongkhag', dist)).first().get(prop_name);
  return ee.Number(median)
}

function gen_secondary_charts(){
  
  annual_NDVI = num_years.map(function(yr){
    return get_med(yr,"NDVI").format('%.3f');
  });
  NDVI_chart = ui.Chart.array.values({array: ee.List(annual_NDVI), axis: 0, xLabels: years})
      .setOptions({
          legend: {position: 'none'},
          title: "Annual median NDVI value",
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'NDVI',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
        
  annual_precip = num_years.map(function(yr){
    return get_med(yr,"P").format('%.3f')
  });
    
  precip_chart = ui.Chart.array.values({array: ee.List(annual_precip), axis: 0, xLabels: years})
      .setOptions({
          legend: {position: 'none'},
          title: "Annual median precipitaion value",
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Precipitation (mm)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
        
  annual_sm = num_years.map(function(yr){
    return get_med(yr,"SM").format('%.3f')
  });
    
  sm_chart = ui.Chart.array.values({array: ee.List(annual_sm), axis: 0, xLabels: years})
      .setOptions({
          legend: {position: 'none'},
          title: "Annual median soil moisture value",
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Soil moisture (mm)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
        
  annual_temp = num_years.map(function(yr){
    return ee.Number(get_med(yr,"T")).format('%.3f');//.subtract(273)
  })
  
  temp_chart = ui.Chart.array.values({array: ee.List(annual_temp), axis: 0, xLabels: years}) 
      .setOptions({
          legend: {position: 'none'},
          title: "Annual median temperature",
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Temperature (°c)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
  if (dist == "All Dzongkhags"){
    print(annual_NDVI)
    curr_NDVI = ui.Label("Median NDVI value in all Dzongkhags for "+year+ ": " + ee.List(annual_NDVI).get(yr_idx).getInfo(),{fontWeight: 'bold'});
    curr_precip = ui.Label("Median precipation value in all Dzongkhags for "+year+ ": " + ee.List(annual_precip).get(yr_idx).getInfo()+ " mm",{fontWeight: 'bold'});
    curr_sm = ui.Label("Median soil moisture value in all Dzongkhag for "+year+ ": " + ee.List(annual_sm).get(yr_idx).getInfo() + " mm",{fontWeight: 'bold'});
    curr_temp = ui.Label("Median temperature in all Dzongkhags for "+year+ ": " + ee.List(annual_temp).get(yr_idx).getInfo() + " °c",{fontWeight: 'bold'});
  }
  else{
    curr_NDVI = ui.Label("Median NDVI value in " +  dist + " Dzongkhag for "+year+ ": " + ee.List(annual_NDVI).get(yr_idx).getInfo(),{fontWeight: 'bold'});
    curr_precip = ui.Label("Median precipation value in " +  dist + " Dzongkhag for "+year+ ": " + ee.List(annual_precip).get(yr_idx).getInfo()+ " mm",{fontWeight: 'bold'});
    curr_sm = ui.Label("Median soil moisture value in " +  dist + " Dzongkhag for "+year+ ": " + ee.List(annual_sm).get(yr_idx).getInfo() + " mm",{fontWeight: 'bold'});
    curr_temp = ui.Label("Median temperature in " +  dist + " Dzongkhag for "+year+ ": " + ee.List(annual_temp).get(yr_idx).getInfo() + " °c",{fontWeight: 'bold'});
  }
}

gen_secondary_charts()
// Set up initial rice map

var IC = 0//placeholder
var IC_chart = 0//placeholder
var diff = 0//placeholder
// var idx = x.indexOf(month)//placeholder

var removedSubdistrictPanel = false//placeholder

function gen_cropped_rice_map(){
  IC = ee.Image(imgList.get(yr_idx)).clip(ROI)   //////imgList_og   ////imgList
}

gen_cropped_rice_map()

var ic_ml = ui.Map.Layer(IC, {min: 0, max: 1, palette: palette1}, year+" rice map");
mapPanel.add(ic_ml);

var con_ml = ui.Map.Layer(IC, {min: 0, max: 1, palette: palette1}, year+" rice map");
mapPanel.add(con_ml);

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

//////Initial stats message 
var filt = 0
var message = 0

function set_stats(){
  var s_year = num_years[yr_idx]
  filt = district_stats.filter(ee.Filter.eq('Year', s_year)).filter(ee.Filter.eq('Dzongkhag', dist)).first().get('Yield(kg/acre)').getInfo(); ///Yield(kg/acre) ///Harvested area(acres)
  if (dist == "All Dzongkhags"){
    
    message = ui.Panel([
    ui.Label("Total harvested yield from rice area in Bhutan for "+year+ " according to DOA statistics: "+  filt +" acres",{fontWeight: 'bold'}),
    ui.Label("Rice area in Bhutan for "+year+ ": "+ ee.Number(area_calc(IC, ROI)).round().getInfo()+" acres",{fontWeight: 'bold'})
    ]);
  }
  else{
    message = ui.Panel([
    ui.Label("Harvested rice area in " +  dist + " Dzongkhag for "+year+ " according to DOA statistics: " + filt +" acres",{fontWeight: 'bold'}),
    ui.Label("Predicted rice area in " + dist + " Dzongkhag for "+year+ ": "+ ee.Number(area_calc(IC, ROI)).round().getInfo()+" acres",{fontWeight: 'bold'})
    ]);
  }
}
set_stats()

var second_panel = ui.Panel({style: {width:'20%'}});

second_panel.add(curr_NDVI)
second_panel.add(NDVI_chart)
second_panel.add(curr_precip)
second_panel.add(precip_chart)
second_panel.add(curr_sm)
second_panel.add(sm_chart)
second_panel.add(curr_temp)
second_panel.add(temp_chart)
ui.root.add(second_panel);

var y = 0;

function gen_rice_chart(){
  y = ee.ImageCollection(imgList).filterDate(num_years[0] + '-01-01', num_years[num_years.length - 1] + '-12-31').toList(num_years.length)
  .map(function(img) {
    return area_calc(img, ROI);
  });
  IC_chart = ui.Chart.array.values({array: y, axis: 0, xLabels: years})
          .setOptions({
          legend: {position: 'none'},
          title: 'Annual rice area',
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Rice area (acres)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
}

var loss_chart = 0;

function gen_loss_chart() {
  // print("gen_loss_chart")
  var curr_yr_idx = ee.Number(yr_idx).add(ee.Number(1));
  print('curr_yr_idx', curr_yr_idx);
  print('years', years);
  var s_years = ee.List(years).slice(curr_yr_idx);
  print('s_years', s_years);
  var ref_year_img = ee.Image(imgList.get(yr_idx));
  var year_ic = imgList.slice(curr_yr_idx);
  print('year_ic', year_ic)
  
  var systemIndexFilterList = [];
  
  for(var i=0;i<s_years.size().getInfo();i++){
    systemIndexFilterList[i]="rice"+s_years.get(i).getInfo();
  }
  print('systemIndexFilterList', systemIndexFilterList)
  
  print('imgList', imgList);
  
  year_ic = imgList.filter(ee.Filter.inList("system:index", systemIndexFilterList));
  print('year_ic', year_ic);
  
  diff = year_ic.map(function (img){
    img = ee.Image(img)
    var sim = ref_year_img.and(img);
    return ee.Number(area_calc(ref_year_img, ROI)).subtract(ee.Number(area_calc(sim, ROI)));
  });
  print('diff', diff)
  loss_chart = ui.Chart.array.values({array: diff, axis: 0, xLabels: s_years})
      .setOptions({
          legend: {position: 'none'},
          title: "Area loss in comparison to the year "  + String(year),
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Rice area (acres)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
}

var gain_chart = 0;

function gen_gain_chart() {
  
  var curr_yr_idx = ee.Number(yr_idx).add(ee.Number(1))
  var s_years = ee.List(years).slice(curr_yr_idx);
  var ref_year_img = ee.Image(imgList.get(yr_idx));
  var year_ic = imgList.slice(curr_yr_idx);
  
  var systemIndexFilterList = [];
  
  for(var i=0;i<s_years.size().getInfo();i++){
    systemIndexFilterList[i]="rice"+s_years.get(i).getInfo();
  }
  
  year_ic = imgList.filter(ee.Filter.inList("system:index", systemIndexFilterList));

  diff = year_ic.map(function (img){
    img = ee.Image(img)
    var sim = ref_year_img.and(img);
    return ee.Number(area_calc(img, ROI)).subtract(ee.Number(area_calc(sim, ROI)));
  });
  gain_chart = ui.Chart.array.values({array: diff, axis: 0, xLabels: s_years})
      .setOptions({
          legend: {position: 'none'},
          title: "Area gain in comparison to the year "  + String(year),
          hAxis: {title: 'Year', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Rice area (acres)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
}


var ricePi = 0

function gen_rice_dist(){
  if (dist == "All Dzongkhags"){
    var distAreas = Districts.map(function(distName){
      return area_calc(IC, BT2.filterMetadata('ADM1_EN','equals',distName))
    })
    ricePi = ui.Chart.array.values({array: distAreas, axis: 0, xLabels: Districts})
    .setChartType('PieChart')
    .setOptions({title: 'Rice area distribution in acres by Dzongkhag'})
  }
  else{
    var distOI = BT2.filterMetadata('ADM1_EN','equals',dist)
    var subList = distOI.aggregate_array('ADM2_EN').sort()
    var distAreas = subList.map(function(subName){
      return area_calc(ee.Image(imgList.get(yr_idx)), distOI.filterMetadata('ADM2_EN','equals',subName))
    })
    ricePi = ui.Chart.array.values({array: distAreas, axis: 0, xLabels: subList})
    .setChartType('PieChart')
    .setOptions({title: 'Rice area distribution in acres by Gewog for ' + dist})
  }
}

var riceHis = 0

function gen_rice_mean(){
  if (dist == "All Dzongkhags"){
    var distMean = Districts.map(function(distName){
      var distOI = BT2.filterMetadata('ADM1_EN','equals',distName)
      var areaList = imgList.map(function(yr_img){
        return area_calc(yr_img, distOI)
      })
      return areaList.reduce(ee.Reducer.mean())
    })
    var distSTD = Districts.map(function(distName){
      var distOI = BT2.filterMetadata('ADM1_EN','equals',distName)
      var areaList = imgList.map(function(yr_img){
        return area_calc(yr_img, distOI)
      })
      return areaList.reduce(ee.Reducer.stdDev())
    })
    var data = distMean.map(function(mean){
      var id = distMean.indexOf(mean)
      var sd = distSTD.get(id)
      return [ee.Number(mean).subtract(ee.Number(sd)), mean, mean,ee.Number(mean).add(ee.Number(sd))]
    })
    riceHis = ui.Chart.array.values({array: data, axis: 0, xLabels: Districts})
    .setChartType('CandlestickChart')
    .setOptions({
          legend: {position: 'none'},
          title: 'Average rice area by Dzongkhag',
          hAxis: {title: 'Dzongkhag', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Average rice area (acres)',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
  }
  else{
    var distOI = BT2.filterMetadata('ADM1_EN','equals',dist)
    var subList = distOI.aggregate_array('ADM2_EN').sort()
    var sub_distMean = subList.map(function(subName){
      var subOI = BT2.filterMetadata('ADM2_EN','equals',subName)
      var areaList = imgList.map(function(yr_img){
        return area_calc(yr_img, subOI)
      })
      return areaList.reduce(ee.Reducer.mean())
    })
    var sub_distSTD = subList.map(function(subName){
      var subOI = BT2.filterMetadata('ADM2_EN','equals',subName)
      var areaList = imgList.map(function(yr_img){
        return area_calc(yr_img, subOI)
      })
      return areaList.reduce(ee.Reducer.stdDev())
    })
    var data = sub_distMean.map(function(mean){
      var id = sub_distMean.indexOf(mean)
      var sd = sub_distSTD.get(id)
      return [ee.Number(mean).subtract(ee.Number(sd)), mean, mean,ee.Number(mean).add(ee.Number(sd))]
    })
    riceHis = ui.Chart.array.values({array: data, axis: 0, xLabels: subList})
    .setChartType('CandlestickChart')
    .setOptions({
          legend: {position: 'none'},
          title: 'Average rice area by Gewog for ' + dist,
          hAxis: {title: 'Gewog', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'Average rice area',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          //curveType: 'function'
        });
  }
}  
// Mask uninterested areas in map visualization.
var maskBackground = [
  {stylers: [{saturation: -100}]}
];

var hand30_100 = ee.ImageCollection("users/gena/global-hand/hand-100").mosaic()
var paletteHand = ['023858', '006837', '1a9850', '66bd63', 'a6d96a', 'd9ef8b', 'ffffbf', 'fee08b', 'fdae61', 'f46d43', 'd73027'];
var vis = {min: 1, max: 150, palette: paletteHand};

var dataset = 0

var ndvi_ml = ui.Map.Layer(ee.Image(ee.List(LS8_annual_collection).get(yr_idx)).clip(ROI),NDVI_vis,"NDVI (30 m)",false)
mapPanel.add(ndvi_ml);

var hand_ml = ui.Map.Layer(hand30_100.clip(ROI), vis, 'HAND (30 m)', false)
mapPanel.add(hand_ml);

var precip_ml = ui.Map.Layer(ee.Image(ee.List(precip_annual_collection).get(yr_idx)).clip(ROI), precipitationVis, 'Precipitation accumulation (4638.3 m)', false);
mapPanel.add(precip_ml);

var sm_ml = ui.Map.Layer(ee.Image(ee.List(sm_annual_collection).get(yr_idx)).clip(ROI), soilMoistureVis, 'Soil Moisture (4638.3 m)', false);
mapPanel.add(sm_ml);

var temp_ml = ui.Map.Layer(ee.Image(ee.List(temp_annual_collection).get(yr_idx)).clip(ROI), TemperatureVis, 'Temperature (11132 m)', false);
mapPanel.add(temp_ml);


function supplementary_maps(){
  mapPanel.remove(ndvi_ml);
  ndvi_ml = ui.Map.Layer(ee.Image(ee.List(LS8_annual_collection).get(yr_idx)).clip(ROI),NDVI_vis,"NDVI (30 m)",false)
  mapPanel.add(ndvi_ml);
  
  mapPanel.remove(hand_ml);
  hand_ml = ui.Map.Layer(hand30_100.clip(ROI), vis, 'HAND (30 m)', false)
  mapPanel.add(hand_ml);
  
  mapPanel.remove(precip_ml);
  precip_ml = ui.Map.Layer(ee.Image(ee.List(precip_annual_collection).get(yr_idx)).clip(ROI), precipitationVis, 'Precipitation accumulation (4638.3 m)', false);
  mapPanel.add(precip_ml);
  
  mapPanel.remove(sm_ml);
  sm_ml = ui.Map.Layer(ee.Image(ee.List(sm_annual_collection).get(yr_idx)).clip(ROI), soilMoistureVis, 'Soil Moisture (4638.3 m)', false);
  mapPanel.add(sm_ml);
  
  mapPanel.remove(temp_ml);
  temp_ml = ui.Map.Layer(ee.Image(ee.List(temp_annual_collection).get(yr_idx)).clip(ROI), TemperatureVis, 'Temperature (11132 m)', false);
  mapPanel.add(temp_ml);
  
  // var RLCMS_2018 = ee.Image('projects/servir-hkh/RLCMS/HKH/landcover/hkh_landcover-2018').clip(ROI.geometry())

  // var RLCMS_crop = RLCMS_2018.eq(7)
  // var RLCMS_crop_only = RLCMS_2018.updateMask(RLCMS_crop);
  
  // Map.addLayer(RLCMS_crop_only, {min: 0, max: 1, palette: palette2}, 'RLCMS_crop_only' ,false)
}

function updateMapPanel(not_date, not_sub, subdist) {
  //print("DDD", dateRange)
  mapPanel.clear();
  mapPanel.remove(ROI_ml);
  ROI_ml = ui.Map.Layer(ROI, {}, "ROI")
  mapPanel.add(ROI_ml);
  gen_cropped_rice_map();
  if (not_date){
    panel.remove(IC_chart);
    gen_rice_chart();
    panel.insert(7,IC_chart);
    
  }
  if (not_sub && not_date){
    panel.remove(riceHis);
    gen_rice_mean();
    panel.insert(9,riceHis);
  }
  if (not_sub){
    panel.remove(message)
    set_stats()
    panel.insert(5,message)
    panel.remove(ricePi);
    gen_rice_dist();
    panel.insert(10,ricePi);
  }
  second_panel.remove(NDVI_chart)
  second_panel.remove(curr_NDVI)
  second_panel.remove(precip_chart)
  second_panel.remove(curr_precip)
  second_panel.remove(sm_chart)
  second_panel.remove(curr_sm)
  second_panel.remove(temp_chart)
  second_panel.remove(curr_temp)
  gen_secondary_charts()
  second_panel.add(curr_NDVI)
  second_panel.add(NDVI_chart)
  second_panel.add(curr_precip)
  second_panel.add(precip_chart)
  second_panel.add(curr_sm)
  second_panel.add(sm_chart)
  second_panel.add(curr_temp)
  second_panel.add(temp_chart)
  
  supplementary_maps()
  
  
  mapPanel.remove(ic_ml);
  ic_ml = ui.Map.Layer(IC, {min: 0, max: 1, palette: palette1}, year+" rice map (30 m)");
  mapPanel.add(ic_ml);
  
  mapPanel.remove(con_ml);
  con_ml = ui.Map.Layer(ee.Image(consImgList.get(yr_idx)).clip(ROI), {min: 0, max: 1, palette: palette1}, "Consistent rice map (30 m)", false);
  mapPanel.add(con_ml);
  
  roi_cent = ROI.geometry().centroid().coordinates()
  mapPanel.setCenter(roi_cent.get(0).getInfo(),roi_cent.get(1).getInfo(), 9);

  
  if (year == "2022"){
    panel.remove(loss_chart)
    loss_chart = ui.Label('Insuffient rice maps after the selected year to compare loss to', {backgroundColor:'#FF7276'});
    panel.insert(16, loss_chart)
    panel.remove(gain_chart)
    gain_chart = ui.Label('Insuffient rice maps after the selected year to compare gain to', {backgroundColor:'#FF7276'});
    panel.insert(16, gain_chart)
  }
  else{
    panel.remove(loss_chart)
    gen_loss_chart()
    panel.insert(12,loss_chart)
    panel.remove(gain_chart)
    gen_gain_chart()
    panel.insert(14,gain_chart)
  }
  mapPanel.setOptions(
    'maskBackground', {maskBackground: maskBackground});
  //Map.addLayer(precipitation_gt1_only.clip(ROI),precipitationVis, 'Precipitation',false);
}  

// Extract distrcit and sub-district names to an array

var DistrictNames = Districts

// Select a sub-district from drop down select widget
var subdistrict_select = ui.Select({
  placeholder: ('Select a Gewog'),
  style: {width: '290px'},
  onChange: function (subdistrict_selection) {
    if (subdistrict_selection == "All Gewogs"){
      ROI = BT2.filterMetadata('ADM1_EN','equals',dist)
    }else{
      ROI = BT2.filterMetadata('ADM1_EN','equals',subdistrict_selection)
    }
    updateMapPanel(true, false, subdistrict_selection)
    return subdistrict_selection
  }
});

// Select a district from drop down select widget
var emptyUI = ui.Label('');
var district_select = ui.Select({
  items: DistrictNames.getInfo(),
  placeholder: ('Select a Dzongkhag'),
  style: {width: '290px'},
  value: 'All Dzongkhags',
  onChange: function (district_selection) {
    if (district_selection == "All Dzongkhags"){
      ROI = BT1
      dist = "All Dzongkhags"
      
      panel.remove(subdistrict_select)
      removedSubdistrictPanel = true
      panel.insert(2,emptyUI)
      
      
    } else {
      ROI = BT1.filterMetadata('ADM1_EN','equals',district_selection)
      dist = district_selection
      if (removedSubdistrictPanel) {
        panel.remove(emptyUI)
        panel.insert(2,subdistrict_select)
        removedSubdistrictPanel = false
      }
      
      var SubDistrictNames = ROI.aggregate_array('ADM2_EN').sort()
      
      SubDistrictNames = ee.List(['All Gewogs']).cat(SubDistrictNames)
      // Pass the sub-district names to the items for the next drop down
      var selected_subdistrict = SubDistrictName.evaluate(function(values) {
        subdistrict_select.items().reset(values);
      })
    }
    updateMapPanel(true, true)
    return district_selection
  }
});

panel.add(district_select);
// panel.add(subdistrict_select);

///////////////////////
//Custom ROI
// var label = ui.Label('Or use your own asset as the area of interest (see Readme for how to load assets)');
// var inputTextbox = ui.Textbox({
//   style: {width:'250px'},
//   placeholder: 'users/your_username/asset_name',
//   onChange: function(input) {
//     ROI = input;
//     updateMapPanel(true, false)
//   }
// });

// panel.add(label).add(inputTextbox);

//////////////////////

var year_selector = ui.Select({
  items: ["2016","2017","2018","2019","2020", "2021","2022"],
  placeholder: ('Select a year'),
  style: {width: '290px'},
  value: year,
  onChange: function (yr){
    year = yr
    yr_idx = years.indexOf(yr)
    updateMapPanel(false, true)
  }
});

var label = ui.Label('Select a reference year to generate layers and graphs.  By default, the year is 2016.');
panel.add(label)
panel.add(year_selector)

panel.add(message)

label = ui.Label('The graph below shows the rice area in acres in the area of interest from 2016 to 2022.');
panel.add(label)
gen_rice_chart();
panel.add(IC_chart);

label = ui.Label('The graph below shows the average rice area in acres produced from aggregated annual crop masks from 2016 to 2022. By default, the regions are distributed by Dzongkhags. If a particular Dzongkhag is selected as the region of interest, the graph shows the distribution by Gewogs.');
panel.add(label)

gen_rice_mean();
panel.add(riceHis);

gen_rice_dist();
panel.add(ricePi);
gen_loss_chart()
label = ui.Label('The graph below displays the trend in the area of rice lost in acres in comparison to the selected year.');
panel.add(label)
panel.add(loss_chart)
gen_gain_chart()
label = ui.Label('The graph below displays the trend in the area of rice gained in acres in comparison to the selected year.');
panel.add(label);
panel.add(gain_chart);

mapPanel.setOptions('maskBackground', {maskBackground: maskBackground});