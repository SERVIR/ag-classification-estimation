////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function randomForest(FeatureCollection, bandList, image, label, parameters) {
  
  parameters = ee.Dictionary(parameters);
  print('parameters', parameters);
  
  var split = 0.75;
  var training = FeatureCollection.filter(ee.Filter.lt('random', split));
  var testing = FeatureCollection.filter(ee.Filter.gte('random', split));
  
  print('training samples', training);
  print('testing samples', testing);
  
  // Make a Random Forest classifier and train it.
  var trainedClassifier = ee.Classifier.smileRandomForest({
    numberOfTrees: parameters.get('numberOfTrees'),
    variablesPerSplit: parameters.get('variablesPerSplit'),
    minLeafPopulation: parameters.get('minLeafPopulation'),
    bagFraction: parameters.get('bagFraction'),
    maxNodes: parameters.get('maxNodes'),
    seed:7
  }).train({
    features: training,
    classProperty: label,
    inputProperties: bandList,
    subsamplingSeed: 7,
  });
  
  var dict_RF = trainedClassifier.explain();
  var variable_importance_RF = ee.Feature(null, ee.Dictionary(dict_RF).get('importance'));
  var chart_variable_importance_RF =
    ui.Chart.feature.byProperty(variable_importance_RF)
    .setChartType('ColumnChart')
    .setOptions({
    title: 'Random Forest Variable Importance',
    legend: {position: 'none'},
    hAxis: {title: 'Bands'},
    vAxis: {title: 'Importance'}
    });
  print("chart_variable_importance_RF", chart_variable_importance_RF);   
  
  
  // Classify the test FeatureCollection.
  var testingClassified = testing.classify(trainedClassifier);

  // Print the confusion matrix.
  var errorMatrix = testingClassified.errorMatrix(label, 'classification');
  print('Error Matrix', errorMatrix);
  print('Test accuracy: ', errorMatrix.accuracy());
  print('Test kappa: ', errorMatrix.kappa());
  print('recall', errorMatrix.producersAccuracy().get([1, 0]));
  print('precision', errorMatrix.consumersAccuracy().get([0, 1]));
  print('f1_score', errorMatrix.fscore().get([1]));
  
  return trainedClassifier;
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.randomForest = randomForest;
