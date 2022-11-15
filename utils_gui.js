var getMed = function (table, year, district, prop_name) {
  var median = table.filter(ee.Filter.eq('Year', year)).filter(ee.Filter.eq('Dzongkhag', district)).first().get(prop_name);
  return ee.Number(median);
};

var getSecondaryCharts = function (yearsList) {

  annualNDVI = yearsList.map(function(year) {
    return getMed(year, "NDVI").format('%.3f');
  });

  ndviChart = ui.Chart.array.values({
    array: ee.List(annual_NDVI), axis: 0, xLabels: yearsList})
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

  annualPrecip = yearsList.map(function(yr){
    return get_med(yr,"P").format('%.3f')
  })
    
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
  })
    
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
    return ee.Number(get_med(yr,"T")).subtract(273).format('%.3f')
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