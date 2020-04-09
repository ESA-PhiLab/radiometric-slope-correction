// load lib
//var slope_lib = require('this needs to point to slope_correction_module.js');
// or use the author ones
var slope_lib = require('users/andreasvollrath/radar:slope_correction_lib.js');

//----------------------------------------------------------------------------------------------------
// AOI
// the Austria AOI and TOI used in the article
var start = '2016-08-15';
var end = '2016-08-16';
var lat = 47.2;
var lng = 11.45;
var geometry = ee.Geometry.Polygon([[[11.25, 47.35], [11.25, 47.05], [11.7, 47.05], [11.7, 47.35]]]);

Map.setCenter(lng, lat, 11);
//----------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------
// Original S1 Collection
var s1_collection = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(geometry)
    .filterDate(start, end)
    .filter(ee.Filter.and(
      ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'),
      ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'),
      ee.Filter.eq('instrumentMode', 'IW')
    ));


// apply loaded lib function on collection (and get back corrected collection with volume model)
var volume = slope_lib.slope_correction(
    s1_collection //,
    // those are optional and need ot be given as a dict
    //{'model': 'volume',
    //'elevation': ee.Image('USGS/SRTMGL1_003'),
    //'buffer': 75      // buffer in meter
    //}
);

// apply loaded lib function on collection (and get back corrected collection with surface model)
var surface = slope_lib.slope_correction(
    s1_collection,
    // those are optional and need ot be given as a dict
    {'model': 'surface',
     'elevation': ee.Image('USGS/SRTMGL1_003'),
     'buffer': 75       // buffer in meter
    }
);

//----------------------------------------------------------------------------------------------------

// see the original bands
print(s1_collection.first(), 'First image of the original S1 collection')
// see the new bands
print(volume.first(), 'First image of the corrected S1 collection');


//----------------------------------------------------------------------------------------------------
// plotting
var image_uncorrected = s1_collection.mosaic().clip(geometry);

// we use this workaround on quality mosaic, to avoid the half-transparent issue
var volume_corrected = volume.qualityMosaic('no_data_mask').clip(geometry);
var surface_corrected = surface.qualityMosaic('no_data_mask').clip(geometry);


// create ratio for RGB, add to image and apply the no-data mask
var ratio_uncorrected = image_uncorrected.select('VV')
                        .subtract(image_uncorrected.select('VH')).rename('ratio');
var image_uncorrected = image_uncorrected.addBands(ratio_uncorrected);

var ratio_volume = volume_corrected.select('VV')
                        .subtract(volume_corrected.select('VH')).rename('ratio');
var image_volume = volume_corrected.addBands(ratio_volume)
                        .updateMask(volume_corrected.select('no_data_mask'));

var ratio_surface = surface_corrected.select('VV')
                        .subtract(surface_corrected.select('VH')).rename('ratio');
var image_surface = surface_corrected.addBands(ratio_surface)
                        .updateMask(surface_corrected.select('no_data_mask'));

// plot single layer and RGB
Map.addLayer(image_surface.select(['VV', 'VH', 'ratio']), {min:[-18, -25, 1], max:[0, -5, 12]}, 'Surface Corrected RGB');
Map.addLayer(image_volume.select(['VV', 'VH', 'ratio']), {min:[-18, -25, 1], max:[0, -5, 12]}, 'Volume Corrected RGB');
Map.addLayer(image_uncorrected.select(['VV', 'VH', 'ratio']), {min:[-18, -25, 1], max:[0, -5, 12]}, 'Uncorrected RGB');
//----------------------------------------------------------------------------------------------------
