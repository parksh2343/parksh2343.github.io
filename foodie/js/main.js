/**
 * 
 */
function init() {
	Baas.API_KEY = '6f25e0bc-f527-4bd0-824d-fcad7c4f2e91';
}

function getStores(onSuccess, onError) {
  var table = Baas.Table.create('store');
  table.fetch({
    success: onSuccess,
    error: onError
  });
}