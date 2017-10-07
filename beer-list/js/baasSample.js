
function sf(model, response){
	$("#result").html(JSON.stringify(response));
}

function ef(model, response){
	console.log(response.responseText);
	$("#error").html(response.responseText);
}

function listObjects(el){
	var table = Baas.Table.create(el.find('#tableName').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function getObject(el){
	var baasObj = Baas.Object.create(el.find('#tableName').val(),{
    		objectId : el.find('#objectId').val()
	});
	baasObj.fetch({
		success : sf,
		error : ef
	});
}

function createObject(el){
	var obj = {};
	obj[el.find('#columnName').val()] = el.find('#columnValue').val();
	
	var baasObj = Baas.Object.create(el.find('#tableName').val(), obj);
	baasObj.save({
		success : sf,
		error : ef
	});
}

function updateObject(el){
	var obj = {};
	obj[el.find('#columnName').val()] = el.find('#columnValue').val();
	obj['objectId'] = el.find('#objectId').val();
	
	var baasObj = Baas.Object.create(el.find('#tableName').val(), obj);
	baasObj.save({
		success : sf,
		error : ef
	});
}

function removeObject(el){
	var baasObj = Baas.Object.create(el.find('#tableName').val(),{
    		objectId : el.find('#objectId').val()
	});
	baasObj.destroy({
		success : sf,
		error : ef
	});
}

// 2015-01-21 jmpark append start
function pointerRowData(el) {	
	var baasObj = Baas.Object.create(el.find('#tableName').val(),{
    		objectId : el.find('#objectId').val()
	});
	baasObj.include(el.find('#columnName').val());
	baasObj.fetch({
		success : sf,
		error : ef
	});
}

function whereLessThan(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).lt(parseInt(el.find('#columnValue').val()));
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereLessThanOrEqual(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).lte(parseInt(el.find('#columnValue').val()));
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereGreaterThan(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).gt(parseInt(el.find('#columnValue').val()));
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereGreaterThanOrEqual(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).gte(parseInt(el.find('#columnValue').val()));
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereEqual(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).eq(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereNotEqual(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).ne(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereContains(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).contains(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereAll(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).all(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereIn(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).in(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereNin(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).nin(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereExists(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).exists(true);
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereNotExists(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).exists(false);
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereStartWith(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).startWith(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereEndWith(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#columnName').val()).endWith(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function whereSkipLimit(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.skip(el.find('#skip').val()).limit(el.find('#limit').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function totalCount(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	var totalCount = table.useCount(true).where(el.find('#columnName').val()).contains(el.find('#columnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function relationInQuery(el) {
    var innerQuery = Baas.Table.create(el.find('#childTableName').val())
    					.where(el.find('#childEqualToColumnName').val())
    						.eq(el.find('#childEqualToColumnValue').val());
    var table = Baas.Table.create(el.find('#parentTableName').val());
 
    table.inQuery(el.find('#parentRelationColumnName').val(), innerQuery).fetch({
		success : sf,
		error : ef
    });
}

function relationNotInQuery(el) {
    var innerQuery = Baas.Table.create(el.find('#childTableName').val())
    					.where(el.find('#childEqualToColumnName').val())
    						.eq(el.find('#childEqualToColumnValue').val());
    var table = Baas.Table.create(el.find('#parentTableName').val());
 
    table.notInQuery(el.find('#parentRelationColumnName').val(), innerQuery).fetch({
		success : sf,
		error : ef
    });
}

function relationRelatedTo(el) {
	var parentTable = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	var childTable = Baas.Table.create(el.find('#childTable').val());
	childTable.relatedTo(parentTable, el.find('#relationColumn').val());
	childTable.fetch({
		success : sf,
		error : ef
	});
}

function relationNotRelatedTo(el) {
	var parentTable = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	var childTable = Baas.Table.create(el.find('#childTable').val());
	childTable.notRelatedTo(parentTable, el.find('#relationColumn').val());
	childTable.fetch({
		success : sf,
		error : ef
	});
}

function compound(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.or(2).where(el.find('#equalToColumnName').val()).eq(el.find('#equalToColumnValue').val());
	table.where(el.find('#startWithColumnName').val()).startWith(el.find('#startWithColumnValue').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function increment(el) {
	var table = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	table.increment(el.find('#columnName').val(), parseInt(el.find('#columnValue').val()));
	table.save({
		success : sf,
		error : ef
	});
}

function arrayAdd(el) {
	var table = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	table.add(el.find('#columnName').val(), el.find('#columnValue').val());
	table.save({
		success : sf,
		error : ef
	});
}

function arrayAddUnique(el) {
	var table = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	table.add(el.find('#columnName').val(), el.find('#columnValue').val(), true);
	table.save({
		success : sf,
		error : ef
	});
}

function arrayRemove(el) {
	var object = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});

	var array = new Array();
	array.push(el.find('#columnValue').val());
	object.remove(el.find('#columnName').val(), array);
	object.save({
			success : sf,
			error : ef
	});
}

function relationRowDataAdd(el) {
	var object = Baas.Object.create(el.find('#tableName').val(), {
 		objectId : el.find('#objectId').val()
 	});
 
	object.fetch({
		success: function () {
			var relation = object.get(el.find('#relationColumn').val());

			var targetObject = Baas.Object.create(el.find('#childTable').val(), {
				objectId: el.find('#childObjectId').val()
			});

		relation.add(targetObject);
		object.save({
				success : sf,
				error : ef
			});
		}
	});
}

function relationRowDataRemove(el) {
	var object = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	
	object.fetch({
		success: function () {
			var relation = object.get(el.find('#relationColumn').val());
			var targetObject = Baas.Object.create(el.find('#childTable').val(), {
				objectId: el.find('#childObjectId').val()
			});

			relation.remove(targetObject);

			object.save({
				success : sf,
				error : ef
			});
		}
 	});
}

function relationInQuery(el){
    var innerQuery = Baas.Table.create(el.find('#childTableName').val())
    					.where(el.find('#childEqualToColumnName').val())
    						.eq(el.find('#childEqualToColumnValue').val());
    var table = Baas.Table.create(el.find('#parentTableName').val());
    table.inQuery(el.find('#parentRelationColumnName').val(), innerQuery).fetch({
		success : sf,
		error : ef
    });
}

function rowColumnUnset(el) {
	var table = Baas.Object.create(el.find('#tableName').val(), {
		objectId : el.find('#objectId').val()
	});
	table.fetch({
		success : function (model, response){
			model.unset(el.find('#columnName').val());
			model.save({
				success : sf,
				error : ef
			});
		},
		error : ef
	});
}

function batchInsert(el) {
 	var obj = {};
 	obj[el.find('#columnName').val()] = el.find('#columnValue').val();
 
	var obj2 = {};
	obj2[el.find('#columnName2').val()] = el.find('#columnValue2').val();
 	
 	var baasObj = Baas.Object.create(el.find('#tableName').val(), obj);
	var baasObj2 = Baas.Object.create(el.find('#tableName').val(), obj2);
 
	Baas.Object.saveAll([
		baasObj,
		baasObj2
	], {
 		success : sf,
 		error :ef
 	});
}

function batchDelete(el) {
	var baasObj = Baas.Object.create(el.find('#tableName').val(), {
		objectId: el.find('#firstObjectId').val()
	});
	var baasObj2 = Baas.Object.create(el.find('#tableName').val(), {
		objectId: el.find('#secondObjectId').val()
	});

	Baas.Object.destroyAll([
		baasObj,
		baasObj2
	], {
		success : sf,
		error :ef
	});
}

function createUser(el){
	var user = new Baas.User({
		username: el.find('#username').val(),
		password: el.find('#password').val(),
		email : el.find('#email').val()
	});
	user.signIn({
		success : sf,
		error : ef
	});
}

function listUsers(el){
	var users = Baas.Users.create();
	users.fetch({
		success : sf,
		error : ef
	});
}

function getUser(el){
	var user = Baas.User.create({
		objectId : el.find('#objectId').val()
	});
	user.fetch({
		success : sf,
		error : ef
	});
}

function updateUser(el){
	var user = Baas.User.create({
		objectId : el.find('#objectId').val(),
		email : el.find('#email').val()
	});
	
	user.save({
		success : sf,
		error : ef
	});
}

function removeUser(el){
	var user = Baas.User.create({
		objectId : el.find('#objectId').val(),
	});
	
	user.destroy({
		success : sf,
		error : ef
	});
}

function loginUser(el){
	var id = el.find('#username').val();
	var pass = el.find('#password').val();
	var user = Baas.User.logIn(id, pass, {
		success : sf,
		error : ef
	});
}

function logoutUser(el){
	Baas.User.logOut();
}

function isLogin(el){
	var user = Baas.User.getMe();
	if(user.isLoggedIn()){
		alert('session alive');
	}else{
		alert('session destroy');
	}
}

function verifyEmail(el){
	var user = Baas.User.create({
		email : el.find('#email').val()
	});
	
	user.sendVerifyEmail();
}

function resetPassword(el){
	var user = Baas.User.create({
		email : el.find('#email').val()
	});
	
	user.sendResetPasswordEmail();
}

function createRole(el){
	var role = Baas.Role.create(el.find('#roleName').val());
	var acl = Baas.Acl.create();
	acl.setPublicReadAccess(true);
	acl.setPublicWriteAccess(false);
	role.setAcl(acl);
	role.save({
		success : sf,
		error : ef
	});
}

function listRole(el){
	var roles = Baas.Roles.create();
	roles.fetch({
		success : sf,
		error : ef
	});
}

function getRole(el){
	var role = Baas.Role.create({
		objectId : el.find('#objectId').val()
	});
	role.fetch({
		success : sf,
		error : ef
	});
}

function updateRole(el){
	var role = Baas.Role.create({
		objectId : el.find('#objectId').val()
	});
	var acl = Baas.Acl.create();
	acl.setPublicWriteAccess(false);
	role.setAcl(acl);
	role.save({
		success : sf,
		error : ef
	});
}

function removeRole(el){
	var role = Baas.Role.create({
		objectId : el.find('#objectId').val()
	});
	role.destroy({
		success : sf,
		error : ef
	});
}


function geoPointInsert(el) {
	var obj = {};
	var geo = Baas.GeoPoint.create(el.find('#latitude').val(), el.find('#longitude').val());

	obj[el.find('#geoColumn').val()] = geo;
	
	var baasObj = Baas.Object.create(el.find('#tableName').val(), obj);
	baasObj.save({
		success : sf,
		error : ef
	});
}

function geoPointNear(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#geoColumn').val()).near(el.find('#latitude').val(), el.find('#longitude').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function geoPointKilometers(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#geoColumn').val()).near(el.find('#latitude').val(), el.find('#longitude').val()).inKilometers(el.find('#kilometers').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function geoPointMiles(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#geoColumn').val()).near(el.find('#latitude').val(), el.find('#longitude').val()).inMiles(el.find('#miles').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function geoPointRadians(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#geoColumn').val()).near(el.find('#latitude').val(), el.find('#longitude').val()).inRadians(el.find('#radians').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function geoPointWithin(el) {
	var table = Baas.Table.create(el.find('#tableName').val());
	table.where(el.find('#geoColumn').val()).within(el.find('#latSouthWest').val(), el.find('#lngSouthWest').val(), el.find('#latNorthEast').val(), el.find('#lngNorthEast').val());
	table.fetch({
		success : sf,
		error : ef
	});
}

function fileUpload(el) {
   Baas.File.upload(el.find('#uploadfile'),{
   		success : sf,
   		error : ef
   });
}

function fileMultiQuery(el) {
	var file = new Baas.Files();	
	file.fetch({
		success : sf,
		error : ef
	});
}
