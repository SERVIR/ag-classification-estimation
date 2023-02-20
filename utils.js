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
      var xic = ImageCollection.filterBounds(ROI).filter(
        ee.Filter.date(ee.Date.fromYMD(y, m, 1), ee.Date.fromYMD(y, m, 30))
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

function dateSplitter (ImageCollection, MonthRange1, MonthRange2, YearRange1, YearRange2, ROI){
  return ee.ImageCollection(
    ImageCollection.filter(ee.Filter.calendarRange(MonthRange1, MonthRange2, 'month'))
                   .filter(ee.Filter.calendarRange(YearRange1, YearRange2, 'year'))
  ).filterBounds(ROI);
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function exportImageAsset (image, description, region, scale, assetId) {
// function exportImageAsset ({image, description, region, scale, assetId} = {}) {
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

exports.bulkRenameBands = bulkRenameBands;
exports.timePeriodSelector = timePeriodSelector;
exports.dateSplitter = dateSplitter;
exports.exportImageAsset = exportImageAsset;

