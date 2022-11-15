/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var imageVisParam = {"opacity":1,"bands":["classification"],"min":1,"max":1,"palette":["dee663"]},
    imageVisParam2 = {"opacity":1,"bands":["classification"],"palette":["fff829"]};
/***** End of imports. If edited, may not auto-convert in the playground. *****/
///////////
var ROI = ee.FeatureCollection("USDOS/LSIB_SIMPLE/2017").filter(ee.Filter.eq('country_na','Bhutan'));
Map.centerObject(ROI)


var IC = ee.ImageCollection("projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/Model_Output_Temp_IC")
//Map.addLayer(IC, {}, "IC")
print("IC", IC)
///////////

var dataset = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
                  .filter(ee.Filter.date('2018-05-01', '2018-05-03'))//.filterBounds(ROI);
var precipitation = dataset.select('precipitation').median().clip(ROI);
var precipitationVis = {
  min: 1.0,
  max: 17.0,
  palette: ['#ffffff ', '0aab1e', 'e7eb05', 'ff4a2d', 'e90000'],
};
//Map.setCenter(17.93, 7.71, 2);
//Map.addLayer(precipitation, precipitationVis, 'Precipitation');

var precipitation_gt1 = precipitation.gt(1);
var precipitation_gt1_only = precipitation.updateMask(precipitation_gt1);


//////////
// var IC_chart = ui.Chart.image.series({
//           imageCollection: IC,
//           region: ROI,
//           reducer: ee.Reducer.count(),
//           scale: 500,
//           xProperty: 'system:time_start'
//         })
//         .setSeriesNames(['classification'])
//         .setOptions({
//           title: 'classification',
//           hAxis: {title: 'Date', titleTextStyle: {italic: false, bold: true}},
//           vAxis: {
//             title: 'classification_pixels',
//             titleTextStyle: {italic: false, bold: true}
//           },
//           lineWidth: 5,
//           colors: ['e37d05', '1d6b99'],
//           curveType: 'function'
//         });
// print("IC_chart",IC_chart)


//////////////////Add Panel
var spacer = ui.Label('           ');

var panel = ui.Panel({style: {width:'18%'}});
var intro = ui.Panel([
  ui.Label('panel 1',{fontWeight: 'bold', fontSize: '18px', margin: '7px 5px'}),
  ui.Label('Rice Classification Approach --more text here--.',{margin: '10px 7px'}),
  // ui.Label(''),
]);
panel.add(intro)

ui.root.add(panel);
//////////////////////

///////////////////////////////////////////////////////////////
///////////////////Function for date slider ///////////////////
///////////////////////////////////////////////////////////////

var Start_period = ee.Date('2015-01-01')
var End_period = ee.Date('2021-12-31')
//var End_period = ee.Date(new Date().getTime())

ee.Dictionary({start: Start_period, end: End_period})
  .evaluate(renderSlider) 

function renderSlider(dates) {
  var slider = ui.DateSlider({ 
    start: dates.start.value, 
    end: dates.end.value, 
    period: 30, // change to adjust the slider/date picker timeframe
    onChange: renderDateRange, //resets everything
    style: {width: '230px', margin: '8px 20px'},
   
  })

  // Map.add(slider)
  var subtitle = ui.Label('Year Selector Slider', {})
  panel.add(subtitle)
  panel.add(slider)
}


///////////////////////////////////////////////////////////////
/////////////////Function for Date Slider Range ///////////////
///////////////////////////////////////////////////////////////
function renderDateRange(dateRange) {
  Map.clear()
  //panel.clear()
  Map.addLayer(IC, imageVisParam2, "IC")
  Map.addLayer(ROI, {}, "ROI",false)
  Map.addLayer(precipitation_gt1_only,precipitationVis, 'Precipitation')
}  


///////////////////////
var label = ui.Label('Or use your own asset as the area of interest (see Readme for how to load assets)');
var inputTextbox = ui.Textbox({
  style: {width:'250px'},
  placeholder: 'users/your_username/asset_name',
  onChange: function(input) {
    var userInput = input;
  }
});

panel.add(label).add(inputTextbox);

//////////////////////

var IC_chart = ui.Chart.image.series({
          imageCollection: IC,
          region: ROI,
          reducer: ee.Reducer.count(),
          scale: 500,
          xProperty: 'system:time_start'
         })
        .setSeriesNames(['classification'])
        .setOptions({
          title: 'classification',
          hAxis: {title: 'Date', titleTextStyle: {italic: false, bold: true}},
          vAxis: {
            title: 'classification_pixels',
            titleTextStyle: {italic: false, bold: true}
          },
          lineWidth: 5,
          colors: ['e37d05', '1d6b99'],
          curveType: 'function'
        });
//print("IC_chart",IC_chart)

// var chart_Jan_2020 = ui.Chart.image.histogram({image: IC.first(), region: ROI, scale: 30, })//.setSeriesNames(["classification"])
// print("chart_Jan_2020",chart_Jan_2020)
panel.add(IC_chart)


////
var chart =
    ui.Chart.image.histogram({image: precipitation_gt1_only, region: ROI, scale: 500})
        .setSeriesNames([precipitation])
        .setOptions({
          title: 'Precipitation',
          hAxis: {
            title: 'precipitation',
            titleTextStyle: {italic: false, bold: true},
          },
          vAxis:
              {title: 'Count', titleTextStyle: {italic: false, bold: true}},
          colors: ['cf513e', '1d6b99', 'f0af07']
        });


panel.add(chart)