//// Step 4 of ACES system Post processing- removing obviously spurious results
//// Created by Tim Mayer NASA SERVIR 5/2/23
//// Post porcessing relies on SERVIR-HKH RLCMS layers and a connected pixel tolerance layer
//// Some users may have permissions issues with the RLCMS layer. This can be swapped for other landcover maps
//// the key classes are Forest and Agriculture 
//// The user will need to change the "crop year map" i.e rice2019_post_processing_example| rice2019 to perform this script
print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
print("Start Forest + Ag + Connected Pixel mask")
print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');

var ROI = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na','Bhutan'));

//// access to the exmaple asset of a rice map
//// https://code.earthengine.google.com/?asset=projects/servir-sco-assets/assets/Bhutan/rice2019_post_processing_example

var rice2019 = rice2019_post_processing_example   /////// Swap this out for the correct crop type year map

var rlcms2019 = ee.Image('projects/servir-hkh/RLCMS/HKH/landcover/hkh_landcover-2019').clip(ROI);  ///////If you can not access swap for a users preffered lc map
Map.addLayer(rlcms2019, {min:1, max:10, palette: '005CE6,73DFFF,73DFFF,267300,2197FF,E60000,FFFF00,D7C29E,E8BEFF,BAFFA3'}, 'RLCMS-2019', false);

var rlcmsag2019 = rlcms2019.eq(7);
Map.addLayer(rlcmsag2019, {}, 'rlcmsag2019');
var rice2019_AgOut = rice2019.updateMask(rlcmsag2019.eq(0)).unmask(0);
Map.addLayer(rice2019_AgOut.selfMask(), {palette: 'yellow'}, 'rice2019_AgOut');

var rlcmsForest2019 = rlcms2019.eq(4);
Map.addLayer(rlcmsForest2019, {}, 'rlcmsForest2019');
var rice2019_Forest_Out = rice2019.updateMask(rlcmsForest2019.eq(0)).unmask(0);
Map.addLayer(rice2019_Forest_Out.selfMask(), {palette: 'green'}, 'rice2019_Forest_Out');


var sum_Ag_Forest2019 = rice2019_AgOut.add(rice2019_Forest_Out);
rice2019 = rice2019.updateMask(sum_Ag_Forest2019.eq(2));
Map.addLayer(rice2019.selfMask(), {palette: 'brown'}, 'sum_Ag_Forest2019');
///////////////////////////////////////////////////////////////////////////
// //connected pixels
//////////////////////////////////////////////////////////////////////////

var connectedRice2019 = rice2019.eq(1).connectedPixelCount({
  maxSize: 128, eightConnected: false
});

// Get a pixel area image.
var pixelArea = ee.Image.pixelArea();

var objectArea2019 = connectedRice2019.multiply(pixelArea);

var areaMask2019 = objectArea2019.gte(3*30*30);

var Forest_Ag_Connected = areaMask2019.updateMask(rlcmsForest2019.eq(0)).unmask(0);

rice2019 = rice2019.updateMask(Forest_Ag_Connected);

Map.addLayer(rice2019.selfMask(), {palette: 'blue'}, 'Forest_Ag_Connected');

Export.image.toAsset({
  image: rice2019,  //// update image
  description: 'connectedRice2019', ///// update image name as needed
  assetId: 'projects/servir-sco-assets/assets/Bhutan/Rice_Extent_Mapper/ConnectedPixels/connectedRice2019', //// update path to final image collection
  scale: 30,
  region: ROI,
  maxPixels: 1E13,
});

print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
print("End")
print('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$');
