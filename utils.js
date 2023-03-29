////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function bulkRenameBands(bandNames, type, phase) {
  if (type == 'sentinel2') {
    return bandNames.map(function (bandName) {
      var splitBandName = ee.String(bandName).split('_');
      return ee.String(splitBandName.get(1)).cat('_').cat(ee.String(splitBandName.get(2))).cat('_').cat(ee.String(splitBandName.get(0)));
    });
  } else if (type == 'sentinel1') {
    return bandNames.map(function (bandName) {
      var splitBandName = ee.String(bandName).split('_');
      return ee.String(phase).cat('_').cat(ee.String(splitBandName.get(1))).cat('_').cat(ee.String(splitBandName.get(0)));
    });
  } else {
    return bandNames.map(function (bandName) {
      var splitBandName = ee.String(bandName).split('_');
      return ee.String(splitBandName.get(1)).cat('_').cat(ee.String(splitBandName.get(0)));
    });
  }
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function timePeriodSelector (ImageCollection, monthsList, yearsList, ROI) {
  var imageCollection = yearsList.map(function (y) {
    var list_ic = monthsList.map(function (m) {
      var startDate = ee.Date.fromYMD(y, m, 1);
      var endDate = startDate.advance(1, 'month').advance(-1, 'day');
      var xic = ImageCollection.filterBounds(ROI).filter(
        ee.Filter.date(startDate, endDate)
      );
      // return xic.toList(xic.size());
      var x = ee.Algorithms.If(xic.size().eq(0), ee.List([]), xic.toList(xic.size()));
      return x;
      
    });
    return ee.List(list_ic).flatten();
  });
  return ee.List(imageCollection).flatten();
}




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getMedianCompositePerMonth(imageCollection, monthsList, yearsList, ROI) {
  var imageCollectionComposites = yearsList.map(function (y) {
    var list_ic = monthsList.map(function (m) {

      var startDate = ee.Date.fromYMD(y, m, 1);
      var endDate = startDate.advance(1, 'month').advance(-1, 'day');

      var xic = imageCollection.filterBounds(ROI).filter(ee.Filter.date(startDate, endDate));
      // var x = ee.Algorithms.If(xic.size().eq(0), ee.List([]), xic.toList(xic.size()));
      // var x = ee.Algorithms.If(xic.size().eq(0), ee.List([]), ee.List([xic.median()]));
      return xic.median().set('system:time_start', startDate).set('system:time_end', endDate);
      
    });
    return ee.List(list_ic).flatten();
  });
  return ee.List(imageCollectionComposites).flatten();
}





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function dateSplitter (ImageCollection, MonthRange1, MonthRange2, YearRange1, YearRange2, ROI){
  return ee.ImageCollection(
    ImageCollection.filter(ee.Filter.calendarRange(MonthRange1, MonthRange2, 'month'))
                   .filter(ee.Filter.calendarRange(YearRange1, YearRange2, 'year'))
  ).filterBounds(ROI);
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function exportImageAsset (image, description, region, scale, assetId) {
  Export.image.toAsset({
    image: image,
    description: description,
    scale: scale || 30,
    maxPixels: 1E13,
    region: region,
    assetId: assetId
  });
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function statisticsForImage (img, ROI, scale) {

  var reducers = ee.Reducer.mean()
    .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.percentile([25, 50, 75], ['Q1', 'Q2', 'Q3']), sharedInputs: true});


  return img.reduceRegion({
    reducer: reducers,
    geometry: ROI,
    scale: scale,
    maxPixels: 1E13
  });
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function statisticsFromImageCollection (imageCollection, monthsList, yearsList, ROI) {

  var reducers = ee.Reducer.mean()
    .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.percentile([25, 50, 75], ['Q1', 'Q2', 'Q3']), sharedInputs: true});

  var imageCollectionReduced = yearsList.map(function (y) {

    var list_ic = monthsList.map(function (m) {
      var startDate = ee.Date.fromYMD(y, m, 1);
      var endDate = startDate.advance(1, 'month').advance(-1, 'day');
  
      var xic = imageCollection.filterBounds(ROI).filter(ee.Filter.date(startDate, endDate));
    
      var ic = ee.ImageCollection(xic);

      var reducer = ic.reduce({reducer: reducers});
    
      return reducer.float().set('system:time_start', startDate).set('system:time_end', endDate);
    });
    return ee.List(list_ic).flatten();
  });
  return ee.List(imageCollectionReduced).flatten();
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function statisticsFromImageCollection2 (imageCollection) {

  var reducers = ee.Reducer.mean()
    .combine({reducer2: ee.Reducer.min(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.max(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.stdDev(), sharedInputs: true})
    .combine({reducer2: ee.Reducer.percentile([25, 50, 75], ['Q1', 'Q2', 'Q3']), sharedInputs: true});

  var reducer = imageCollection.reduce({reducer: reducers});

  return reducer.float();
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.bulkRenameBands = bulkRenameBands;
exports.timePeriodSelector = timePeriodSelector;
exports.dateSplitter = dateSplitter;
exports.exportImageAsset = exportImageAsset;
exports.getMedianCompositePerMonth = getMedianCompositePerMonth;
exports.statisticsFromImageCollection = statisticsFromImageCollection;
exports.statisticsFromImageCollection2 = statisticsFromImageCollection2;
exports.statisticsForImage = statisticsForImage;


