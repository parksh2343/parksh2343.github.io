/* jshint ignore:start */
/**
 * @module baas
 */
 (function (root) {
    root.Baas = root.Baas || {};
    root.Baas.VERSION = '1.1.3';
    
    var Baas = root.Baas;
    
    
    //if (typeof exports)
    if (typeof exports !== 'undefined') {
        root.isServer = true;
        
        root.$ = require('jquery');
        root._ = require('underscore');
        root.Q = require('q');
        root.Backbone = require('backbone');
        root.Express = require('express');
    } else {};
    
}(this));

(function (Baas, Root) {
    // 서버에선 global, 브라우저에선 window를 루트로 선언.  
    var definition = function ($, _, Q, Backbone) {
        Root.Baas = Baas(Root.$, Root._, Root.Q, Root.Backbone);
        if (Root.isServer) {
            Root.Baas.isServer = true;
        }
    };
    
    if (typeof define === 'function' && define.amd) {
        define([
            'jquery',
            'underscore',
            'q',
            'Backbone'
        ], definition);
    } else {
        definition(this.$, this._, this.Q, this.Backbone);
    }
})(function ($, _, Q, Backbone) {

var Baas = {};
/* jshint ignore:end */
(function (Baas) {
    /**
     * API Key를 설정한다.
     * @type {String}
     */
    Baas.API_KEY = '';

    /**
     * Baas의 기본 URL
     *
     * @type {String}
     */
    Baas.ROOT_URL = 'https://apis.sktelecom.com';

    /**
     * Baas API의 기본 URL
     * @type {String}
     */
    Baas.URL = Baas.ROOT_URL + '/v1/baas';

    /**
     * 기본 에러 코드
     * @type {Object}
     */
    Baas.ERROR_CODE = {
        REQUIRED_PARAMETERS: '9401',
        FAIL_TO_AUTHENTICATION: '9403',
        FORBIDDEN_TO_ACCESS: '9404',
        REQUIRED_HEADERS: '9405',
        REQUIRED_TABLE_NAME: '1103',
        INVALID_GEOPOINT_TYPE: '0101',
        REQUIRED_MANDATORY_COLUMNS: '0002',
        INVALID_JSON_TYPE: '1107',
        INVALID_OBJECT: '1108',
        INVALID_TYPE: '1111',
        INVALID_EMAIL: '1125',
        NOT_EXITST_COLUMN: '1126',
        NOT_PREPARE_SEND_VERIFY_EMAIL: '1127',
        EXISTS_OBJECT_ID: '1131'
    };

    /**
     * URL 패턴에 따른 헤더를 반환
     *
     * @param {String} url
     * @return {Object}
     */
    var _getHeaders = function (url) {
        var headers = {
            TDCProjectKey: Baas.API_KEY
        };

        var me = Baas.User.getMe();

        if (me && me.isLoggedIn()) {
            headers.sessionToken = me.get('sessionToken');
        }

        return headers;
    };

    // Backbone.Ajax를 확장한다
    Backbone.ajax = function (options) {
        var deferred = Q.defer();

        options = _.defaults(options || {}, {
            dataType: 'json'
        });

        options.headers = _.defaults(options.headers || {}, _getHeaders(options.url));

        try {
            $.ajax(options).then(function (data) {
                data = data || {};
                deferred.resolve(data);
            }, function (xhr) {
                deferred.reject(xhr);
            });
        } catch (e) {
            deferred.reject(e);
        }

        return deferred.promise;
    };
})(Baas);
(function (Baas) {
    var _systemAttributes = [
        'objectId',
        'createdAt',
        'updatedAt'
    ];

    var OPERATOR = {
        ADD: 'Add',
        ADD_UNIQUE: 'AddUnique',
        REMOVE: 'Remove',
        DELETE: 'Delete',
        INCREMENT: 'Increment',
        ADD_RELATION: 'AddRelation',
        REMOVE_RELATION: 'RemoveRelation'
    };

    var TYPE = {
        RELATION: 'Relation'
    };

    /**
     * @class Baas.Object
     * @param {Object} [attributes] Object의 기본 값
     * @param {Object} [options] Backbone.Model의 options
     * @param {String} [options.include] Baas.Object#include 참조
     * @extends {Backbone.Model}
     */
    Baas.Object = Backbone.Model.extend(/** @lends Baas.Object.prototype */{
        /**
         * 테이블 이름
         *
         * @type {String}
         */
        name: '',

        /**
         * Baas에서 쓰는 기본 아이디 키
         * @ignore
         */
        idAttribute: 'objectId',

        /**
         * @ignore
         */
        urlRoot: function () {
            return Baas.URL + '/data/' + this.name;
        },

        /**
         * @ignore
         */
        initialize: function (attributes, options) {
            options = options || {};

            if (options.include) {
                this.include(options.include);
            }

            this._operations = {};

            this.listenTo(this, 'sync', function () {
                this._operations = {};
            });
        },

        /**
         * 시스템 변수는 요청에서 제외되도록 한다
         * @ignore
         * @override
         * @return {String}
         */
        toJSON: function () {
            var data = Backbone.Model.prototype.toJSON.apply(this, arguments);

            _.each(_systemAttributes, function (attribute) {
                if (typeof data[attribute] !== 'undefined') {
                    delete data[attribute];
                }
            });

            // Relation 기본 설정은 제거
            _.each(this.attributes, function (value, key) {
                if ((value instanceof Baas.Relation)) {
                    delete data[key];
                }
            }, this);

            // 실행하지 않은 명령이 있다면 실행
            _.each(this._operations, function (value, key) {
                data[key] = value;
            });

            // objectId는 url param으로 전송되게 된다
            if (data.objectId) {
                delete data.objectId;
            }

            return data;
        },

        /**
         * 서버에서 받은 데이터 파싱
         * @ignore
         */
        parse: function (res) {
            res = _.clone(res);
            res.createdAt = new Baas.Date(res.createdAt);
            res.updatedAt = new Baas.Date(res.updatedAt || res.createdAt.toString());

            _.each(res, function (value, key) {
                if (typeof value === 'object') {
                    if (value.__type) {
                        switch (value.__type) {
                        case 'Date':
                            res[key] = new Baas.Date(value);
                            break;

                        case 'Pointer':
                            res[key] = new Baas.Pointer(value, null, this, key);
                            break;

                        case 'Relation':
                            res[key] = new Baas.Relation(value, this, key);
                            break;
                        } 
                    } else if (key === 'ACL') {
                        res[key] = new Baas.Acl(value);
                    } else if (_.isEqual(Baas.GeoPoint.keys, _.keys(value))) {
                        res[key] = new Baas.GeoPoint(value);
                    } else if (value.url && value.name && value.createdAt){
                        res[key] = new Baas.File(value);
                    }
                } 
            }, this);

            return res;
        },

        /**
         * @override
         * @ignore
         * @param {String|Object} key
         * @param {*} [value]
         * @param {Object} [options]
         * @param {Boolean} [options.skipDeleteOperation] operation을 등록하는 셋팅인 경우 이 값을 true로 설정한다
         */
        set: function (key, value, options) {
            if (typeof key === 'object') {
                _.each(key, function (value, key) {
                    this.set(key, value, options);
                }, this);

                return this;
            }

            options = options || {};

            // Date 객체인 경우, Baas.Date 객체로 변환함
            if (value instanceof Date) {
                value = new Baas.Date(value);

            // Baas.File 객체인 경우 value 변환. updated 2015-10-07
            } else if (value instanceof Baas.File) {
                value = {url : value.get("url"), name : value.get("name"), createdAt : value.get("createdAt")};

            // Baas.Object 객체인 경우 Baas.Pointer 객체로 변환함
            } else if (value instanceof Baas.Object) {
                value = new Baas.Pointer(value, null, this, key);
            
            // Baas.Table 객체인 경우 Baas.Relation 객체로 변환함
            } else if (value instanceof Baas.Table) {
                value = new Baas.Relation(value, this, key);
            
            // Pointer, Relation이면 parent로만 연결해 둠
            } else if ((value instanceof Baas.Relation) || (value instanceof Baas.Pointer)) {
                value.setParent(this);
                value.setKey(key);
            }

            // operation이 있는 키가 설정되면 operation을 덮음
            if (!options.skipDeleteOperation &&
                    this._operations &&
                    (key in this._operations)) {
                delete this._operations[key];
            }

            return Backbone.Model.prototype.set.call(this, key, value, options);
        },

        /**
         * @ignore
         * @override
         */
        unset: function (key, options) {
            var prevValue = this.get(key);
            var operator = prevValue && (prevValue instanceof Baas.Relation) ?
                            OPERATOR.REMOVE_RELATION : OPERATOR.DELETE;

            Backbone.Model.prototype.unset.call(this, key, options);

            this._operations[key] = {
                __op: operator
            };

            return this;
        },

        /**
         * @ignore
         */
        fetch: function (options) {
            var self = this;
            options = options || {};

            if (this._include) {
                options = _.defaults(options, {
                    data: {
                        include: this._include
                    }
                });
            }

            return Backbone.Model.prototype.fetch.call(this, options).then(function () {
                return self;
            });
        },

        /**
         * Backbone.Model#save와는 다른게, attributes 에서 success와 error 콜백을 정의한 경우
         * options에 쓴 것과 동일하게 동작한다. 아래 케이스가 모두 동작한다.
         *
         * ```
         * model.save({
         *     success: function () {
         *         // ...
         *     }
         * });
         * 
         * model.save(null, {
         *     success: function () {
         *         // ...
         *     }
         * });
         * 
         * model.save({
         *     name: 'test',
         *     success: function () {
         *         // ...
         *     }
         * });
         * ```
         *
         * @override Backbone.Model#save
         * @see Backbone.Model#save
         */
        save: function (key, val, options) {
            var attrs;
            var self = this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (key === null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options = options || {};

            // 객체가 있을 때, 객체에 success, error 콜백이 있을 경우 콜백 자리에 전달해줌
            if (attrs) {
                if (('success' in attrs) && _.isFunction(attrs.success)) {
                    options.success = attrs.success;
                    delete attrs.success;
                }

                if (('error' in attrs) && _.isFunction(attrs.error)) {
                    options.error = attrs.error;
                    delete attrs.error;
                }
            }

            return Backbone.Model.prototype.save.call(this, attrs, options).then(function () {
                this._addOperations = {};
                this._removeOperations = {};

                return self;
            });
        },

        /**
         * 서버에서 자료를 가져올 떄 Pointer 자료를 포함시켜서 가져온다 
         * 모델을 생성할 때 options에서 설정할 수도 있다
         * 
         * @param {String} key 컬럼 이름
         * @return {Baas.Object}
         */
        include: function (key) {
            this._include = key;
            return this;
        },

        /**
         * 자동 증감 값을 수정한다
         *
         * @param {String} key 컬럼 이름
         * @param {Number} [value=1] 증감량. 감소는 음수로 표현할 수 있다.
         * @return {Baas.Object}
         */
        increment: function (key, value) {
            if (typeof value === 'undefined') {
                value = 1;
            }

            this._operations[key] = {
                __op: OPERATOR.INCREMENT,
                amount: value
            };

            return this;
        },

        /**
         * 배열에 값을 추가한다
         *
         * @param {String} key 배열인 컬럼 이름이어야 한다
         * @param {*} value
         * @param {Boolean} [isUnique] 중복되지 않은 값만 넣을 것인지 여부
         * @return {Baas.Object}
         */
        add: function (key, value, isUnique) {
            var prevValue = this.get(key);
            var operator = OPERATOR.ADD;
            var skipDeleteOperation = true;
            var nextValue;

            prevValue = prevValue || [];
            value = _.isArray(value) ? value : [value];
            nextValue = prevValue.concat(value);

            if (isUnique) {
                operator = OPERATOR.ADD_UNIQUE;
                nextValue = _.unique(nextValue);
            }

            // 이미 관련 오퍼레이션이 있다면 초기화함
            if (this._operations[key]) {
                skipDeleteOperation = false;
            } else {
                this._operations[key] = {
                    __op: operator,
                    objects: value
                };
            }

            return this.set(key, nextValue, {
                skipDeleteOperation: skipDeleteOperation
            });
        },

        /**
         * 중복되지 않은 값을 배열에 추가한다
         *
         * @param {String} key 배열인 컬럼 이름이어야 한다
         * @param {*} value
         * @return {Baas.Object}
         */
        addUnique: function (key, value) {
            return this.add(key, value, true);
        },

        /**
         * 배열의 값을 삭제한다. 중복된 값이 있을 경우 모두 삭제된다
         *
         * @param {String} key
         * @param {Array|*} value
         * @return {Baas.Object}
         */
        remove: function (key, value) {
            var prevValue = this.get(key) || [];
            var operator = OPERATOR.REMOVE;
            var skipDeleteOperation = true;
            var nextValue;

            value = _.isArray(value) ? value : [value];
            nextValue = _.clone(value);
            nextValue.unshift(prevValue);
            nextValue = _.without.apply(_, nextValue);

            // 이미 관련 오퍼레이션이 있다면 초기화함
            if (this._operations[key]) {
                skipDeleteOperation = false;
            } else {
                this._operations[key] = {
                    __op: operator,
                    objects: value
                };
            }

            return this.set(key, nextValue, {
                skipDeleteOperation: skipDeleteOperation
            });
        },

        /**
         * 새로 만든 Object에 대해서 특정 컬럼을 Relation으로 설정한다
         *
         * @param {String} key Column 이름
         * @param {String} dataName 테이블 이름
         * @return {Baas.Relation} 생성된 Relation을 반환
         */
        setRelation: function (key, dataName) {
            var relation = new Baas.Relation(dataName, this, key);
            this.set(key, relation);
            return relation;
        },

        /**
         * 새로 만든 Object에 대해서 특정 컬럼을 Pointer로 설정한다
         *
         * @param {String} key Column 이름
         * @param {String} dataName 테이블 이름
         * @param {String} objectId Object 아이디
         * @return {Baas.Pointer} 생성된 Pointer를 반환
         */
        setPointer: function (key, dataName, objectId) {
            var pointer = new Baas.Pointer(dataName, objectId, this, key);
            this.set(key, pointer);
            return pointer;
        },

        /**
         * @ignore
         */
        addRelation: function (key, objects) {
            this._addRelationOperators(OPERATOR.ADD_RELATION, key, objects);
        },

        /**
         * @ignore
         */
        removeRelation: function (key, objects) {
            this._addRelationOperators(OPERATOR.REMOVE_RELATION, key, objects);
        },

        /**
         * @private
         */
        _addRelationOperators: function (operator, key, objects) {
            objects = _.isArray(objects) ? objects : [objects];
            this._operations[key] = this._operations[key] || {};

            // 기본 구성 준비
            if (!this._operations[key] || !this._operations[key].__op ||
                    this._operations[key].__op !== operator) {
                this._operations[key] = {
                    __op: operator,
                    objects: []
                };
            }

            this._operations[key].objects = this._operations[key].objects.concat(_.map(objects, function (object) {
                return {
                    __type: TYPE.RELATION,
                    dataName: object.name,
                    objectId: object.get('objectId')
                };
            }));
        },

        /**
         * 이미 생성된 모델인지 여부
         * @private
         * @return {Boolean}
         */
        _isCreated: function () {
            return this.get('objectId') ? true : false;
        },

        /**
         * 설정된 ACL이 있다면 반환
         *
         * @return {Baas.Acl}
         */
        getAcl: function () {
            if (!this.get('ACL')) {
                this.set('ACL', new Baas.Acl());
            }

            return this.get('ACL');
        },

        /**
         * ACL을 설정한다
         *
         * @param {Baas.Acl} acl
         */
        setAcl: function (acl) {
            this.set('ACL', acl);
        }
    });

    /**
     * 테이블 이름이 매핑된 Baas.Object의 클래스를 생성한다.
     * 
     * @static
     * @param {String} name 테이블 이름
     * @param {Object} [attributes] Backbone.Model의 attributes
     * @param {Object} [options] Backbone.Model의 options
     * @return {Baas.Object} 테이블 이름이 매핑된 Baas.Object의 인스턴스
     */
    Baas.Object.create = function (name, attributes, options) {
        return new (Baas.Object.extend({
            name: name
        }))(attributes, options);
    };

    /**
     * 여러 Baas.Object를 한꺼번에 저장할 때 사용한다.
     *
     * @param {Array} list Baas.Object 인스턴스 배열
     * @param {Object} options
     * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
     * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
     * @return {Promise}
     */
    Baas.Object.saveAll = function (list, options) {
        var batches = new Baas.Batches();
        var success;
        var error;
        options = options || {};

        if (options.success) {
            success = options.success;
            options.success = function (res) {
                // 개별 Object 처리
                if (res.results && res.results.length) {
                    _.each(res.results, function (result, key) {
                        var model = list[key];
                        var serverAttrs;
                        var data;

                        if (result.success) {
                            data = result.success;
                            serverAttrs = model.parse(data, options);

                            if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
                                return;
                            }

                            model.trigger('sync', model, data, options);
                        } else if (result.error) {
                            data = result.error;
                            model.trigger('error', model, data, options);
                        }
                    });
                }

                success(list, res, options);
            };
        }

        if (options.error) {
            error = options.error;
            options.error = function (reason) {
                error(list, reason, options);
            };
        }

        batches.addRequests(function () {
            // 실행
            _.invoke(list, 'save');
        });

        return batches.request(options).then(function () {
            return list;
        });
    };

    /**
     * 여러 Baas.Object를 한꺼번에 삭제할 때 사용한다.
     *
     * @param {Array} list Baas.Object 인스턴스 배열
     * @param {Object} options
     * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
     * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
     * @return {Promise}
     */
    Baas.Object.destroyAll = function (list, options) {
        var batches = new Baas.Batches();
        var success;
        var error;
        options = options || {};

        if (options.success) {
            success = options.success;
            options.success = function (res) {
                // 개별 Object 처리
                if (res.results && res.results.length) {
                    _.each(res.results, function (result, key) {
                        var model = list[key];
                        var data;

                        if (result.success) {
                            data = result.success;
                            
                            if (!model.isNew()) {
                                model.trigger('sync', model, data, options);
                            } else {
                                model.trigger('destroy', model, model.collection, options);
                            }
                        } else {
                            data = result.error;
                            model.trigger('error', model, data, options);
                        }
                    });
                }

                success(list, res, options);
            };
        }

        if (options.error) {
            error = options.error;
            options.error = function (reason) {
                error(list, reason, options);
            };
        }

        batches.addRequests(function () {
            // 실행
            _.invoke(list, 'destroy');
        });

        return batches.request(options).then(function () {
            return list;
        });
    };

    /**
     * @static
     * @see Backbone.Model#extend
     */
    Baas.Object.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    var TYPE = {
        WRITE: 'write',
        READ: 'read'
    };

    var ACCESS_ALL = '*';
    var ROLE_PREFIX = 'role:';
    var ROLE_DELIMITER = ':';

    /**
     * 접근 권한을 정의한 Access Control List 자료형
     * @class
     * @param {Object|Baas.Acl} acl
     * @extends {Backbone.Events}
     */
    Baas.Acl = function (acl) {
        this._acl = {};

        if (acl instanceof Baas.Acl) {
            this._acl = acl.toJSON();
        } else if (acl) {
            this._acl = acl;
        } else {
            this._acl[ACCESS_ALL] = {
                read: true,
                write: true
            };
        }
    };

    _.extend(Baas.Acl.prototype, Backbone.Events, /** @lends Baas.Acl.prototype */{
        toJSON: function () {
            return _.clone(this._acl);
        },

        /**
         * 모두에게 해당되는 읽기 권한 설정
         *
         * @param {Boolean} access true면 권한이 있음
         * @return {Baas.Acl}
         */
        setPublicReadAccess: function (access) {
            this._setAccessControl(TYPE.READ, ACCESS_ALL, access);
            return this;
        },

        /**
         * 모두에게 해당되는 쓰기 권한 설정
         *
         * @param {Boolean} access true면 권한이 있음
         * @return {Baas.Acl}
         */
        setPublicWriteAccess: function (access) {
            this._setAccessControl(TYPE.WRITE, ACCESS_ALL, access);
            return this;
        },


        /**
         * 사용자나 Role에 해당되는 읽기 권한 설정
         *
         * @param {Baas.User|Baas.Role} target 대상 사용자나 Role 인스턴스
         * @param {Boolean} access true면 권한이 있음
         * @return {Baas.Acl}
         */
        setReadAccess: function (target, access) {
            this._setAccessControl(TYPE.READ, target, access);
            return this;
        },

        /**
         * 사용자나 Role에 해당되는 쓰기 권한 설정
         *
         * @param {Baas.User|Baas.Role} target 대상 사용자나 Role 인스턴스
         * @param {Boolean} access true면 권한이 있음
         * @return {Baas.Acl}
         */
        setWriteAccess: function (target, access) {
            this._setAccessControl(TYPE.WRITE, target, access);
            return this;
        },

        /**
         * @private
         */
        _setAccessControl: function (type, target, access) {
            if (target instanceof Baas.Role) {
                if (!target.get('name')) {
                    throw new Error('Role needs a name before assign to ACL');
                }

                target = ROLE_PREFIX + target.get('name');
            } else if (target instanceof Baas.User) {
                target = target.get('objectId');
            }

            this._acl[target] = this._acl[target] || {};

            if (!access && this._acl[target][type]) {
                delete this._acl[target][type];
            }

            if (access) {
                this._acl[target][type] = true;
            }

            if (_.keys(this._acl[target]).length === 0) {
                delete this._acl[target];
            }
        },

        /**
         * 대상 유저나 Role이 읽기 권한이 있는지 여부를 반환
         *
         * @param {Baas.User|Baas.Role} [target] 값이 없으면, 모두에게 권한이 있는지를 확인
         * @return {Boolean}
         */
        canRead: function (target) {
            return this._canAccess(TYPE.READ, target);
        },

        /**
         * 대상 유저나 Role이 쓰기 권한이 있는지 여부를 반환
         *
         * @param {Baas.User|Baas.Role} [target] 값이 없으면, 모두에게 권한이 있는지를 확인
         * @return {Boolean}
         */
        canWrite: function (target) {
            return this._canAccess(TYPE.WRITE, target);
        },

        /**
         * @private
         */
        _canAccess: function (type, target) {
            var isAll = false;
            var isTargetUser = false;
            var isTargetRole = false;

            if (!target || target === '*') {
                isAll = true;
            } else if (target instanceof Baas.Role) {
                isTargetRole = true;
            } else if (target instanceof Baas.User) {
                isTargetUser = true;
            }

            return _.some(this._acl, function (acl, key) {
                var isRole = key.indexOf(ROLE_PREFIX) === 0;
                var roleName;

                if (isRole) {
                    roleName = _.rest(key.split(ROLE_DELIMITER)).join(ROLE_DELIMITER);
                }

                // 대상과 관련된 권한이라면
                if (key === ACCESS_ALL ||
                        (isRole && isTargetRole && target.get('name') === roleName) ||
                        (isTargetUser && target.get('objectId') === key)) {
                    
                    // 권한이 있을 때 Loop을 종료함
                    if (acl[type]) {
                        return true;
                    }
                }
            });
        }
    });

    /**
     * @static
     * @param {Object|Baas.Acl} acl
     * @return {Baas.Acl}
     */
    Baas.Acl.create = function (acl) {
        return new Baas.Acl(acl);
    };

    /**
     * @static
     * @see Backbone.Model#extend
     */
    Baas.Acl.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    var TYPE = 'Pointer';

    /**
     * 다른 테이블의 Object를 연결하는 Object의 자료형
     * @class Baas.Pointer
     * @param {String|Baas.Object|Object} name 테이블 이름이나 Baas.Object 객체, 서버에서 반환받은 객체를 넣을 수 있다
     * @param {String} [id] Object 아이디
     * @param {Baas.Object} [parent] 부모 Object
     * @param {String} [key] 부모 Object의 Column 이름
     * @extends {Backbone.Events}
     */
    Baas.Pointer = function (name, id, parent, key) {
        this._name = null;
        this._id = null;
        this._data = null;
        this._parent = parent;
        this._key = key;

        if (typeof name === 'string') {
            this._name = name;
            this._id = id;
        } else {
            if (name instanceof Baas.Object) {
                this._name = name.name;
                this._id = name.get('objectId');
                this._data = name;
            } else if (!name.__type || name.__type !== TYPE) {
                throw new Error('Invalid Pointer type');
            } else {
                this._name = name.dataName;
                this._id = name.objectId;

                delete name.dataName;
                delete name.objectId;
                delete name.__type;

                // 기본 값을 제외하고도 데이터가 들어있을 때에는 include 옵션을 사용한 것으로 간주하고
                // 값을 구해서 넣어놓는다
                if (name && _.keys(name).length) {
                    this._data = Baas.Object.create(this._name, _.extend(name, {
                        objectId: this._id
                    }));
                }
            }
        }
    };

    _.extend(Baas.Pointer.prototype, Backbone.Events, /** @lends Baas.Pointer.prototype */{
        /**
         * @ignore
         */
        toJSON: function () {
            return {
                __type: TYPE,
                dataName: this._name,
                objectId: this._id
            };
        },

        /**
         * 연결돼 있는 Object 자료를 반환한다.
         * 이미 서버에서 가져온 자료가 있다면 갖고 있는 자료를 반환한다.
         * 
         * @todo fetch하지 않고 바로 get()해서 Baas.Object의 fetch를 사용하게 하는 방법도 있음
         * 어떤게 더 편할지는 고민해 봐야 함
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @param {Boolean} [force] 자료 캐시 여부와 관계 없이 새로운 자료를 서버에서 가져오고 싶을 땐 force 인자를 true로 설정한다
         * @return {Promise} 인자가 Baas.Object 인스턴스인 Promise를 반환한다
         */
        fetch: function (options, force) {
            options = options || {};

            if (!force && this._data) {
                if (options.success) {
                    options.success(this._data);
                }

                return Q.resolve(this._data);
            }

            this._data = Baas.Object.create(this._name, {
                objectId: this._id
            });

            return this._data.fetch(options);
        },

        /** 
         * 부모를 설정한다
         * @param {Baas.Object} parent
         * @return {Baas.Relation}
         */
        setParent: function (parent) {
            this._parent = parent;
            return this;
        },

        /**
         * Relation을 갖고 있는 부모 Object를 반환한다
         * @return {Baas.Object}
         */
        getParent: function () {
            return this._parent;
        },

        /** 
         * 부모의 키를 설정한다
         * @param {String} key
         * @return {Baas.Relation}
         */
        setKey: function (key) {
            this._key = key;
            return this;
        },

        /**
         * 저장돼있는 객체를 반환한다.
         *
         * @return {Baas.Object}
         */
        getObject: function () {
            return this._data || null;
        }
    });

    /**
     * @static
     * @param {String|Baas.Object|Object} name 테이블 이름이나 Baas.Object 객체, 서버에서 반환받은 객체를 넣을 수 있다
     * @param {String} [id] Object 아이디
     * @param {Baas.Object} [parent] 부모 Object
     * @param {String} [key] 부모 Object의 Column 이름
     * @return {Baas.GeoPoint}
     */
    Baas.Pointer.create = function (name, id, parent, key) {
        return new Baas.Pointer(name, id, parent, key);
    };

    /**
     * @static
     * @see Backbone.Model#extend
     */
    Baas.Pointer.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    var TYPE = 'Relation';

    /**
     * 다른 테이블에서 다수의 Object를 연결하는 Object의 자료형
     * @class
     * @param {String|Object} name 테이블 이름이나 서버에서 반환받은 객체
     * @param {Baas.Object} [parent] 부모 Object
     * @param {String} [key] 부모 Object의 column 이름
     * @extends {Backbone.Events}
     */
    Baas.Relation = function (name, parent, key) {
        this._name = null;
        this._data = null;
        this._parent = this.setParent(parent);
        this._key = key;
        this._isAdded = false;
        this._isRemoved = false;

        if (typeof name === 'string') {
            this._name = name;
        } else {
            if (name instanceof Baas.Table) {
                this._name = name.name;
                this._data = name;
            } else if (!name.__type || name.__type !== TYPE) {
                throw new Error('Invalid Relation type');
            } else {
                this._name = name.dataName;
            }
        }

        // 데이터를 담을 Table을 생성함
        if (!this._data) {
            this._data = Baas.Table.create(this._name);
        }
    };

    _.extend(Baas.Relation.prototype, Backbone.Events, /** @lends Baas.Relation.prototype */{
        toJSON: function () {
            return {
                __type: TYPE,
                dataName: this._name
            };
        },

        /**
         * @return {Baas.Table}
         */
        getTable: function () {
            return this._data;
        },

        /** 
         * 부모를 설정한다
         * @param {Baas.Object} parent
         * @return {Baas.Relation}
         */
        setParent: function (parent) {
            if (parent) {
                this._parent = parent;
                this.listenTo(this._parent, 'sync', function () {
                    this._isAdded = false;
                    this._isRemoved = false;
                });
            }
            return this;
        },

        /** 
         * 부모의 키를 설정한다
         * @param {String} key
         * @return {Baas.Relation}
         */
        setKey: function (key) {
            this._key = key;
            return this;
        },

        /**
         * Relation을 갖고 있는 부모 Object를 반환한다
         * @return {Baas.Object}
         */
        getParent: function () {
            return this._parent;
        },

        /**
         * Relation 데이터에 Object를 추가한다
         * add를 save하지 않고 remove를 하려 했을 때에는 exception이 발생한다.
         *
         * @param {Baas.Object|Array} objects
         * @return {Baas.Relation}
         */
        add: function (objects) {
            this._data.add(objects);

            // 매핑되지 않았다면 add, remove를 쓸 수 없음
            if (!this._parent) {
                throw new Error('To add operation needs a parent instance');
            }

            if (this._isRemoved) {
                throw new Error('Save a parent object first to remove relation rows');
            }

            this._parent.addRelation(this._key, objects);
            this._isAdded = true;
            return this;
        },

        /**
         * Relation 데이터에 Object를 제거한다
         * remove를 save하지 않고 add를 하려 했을 때에는 exception이 발생한다.
         *
         * @param {Baas.Object|Array} objects
         * @return {Baas.Relation}
         */
        remove: function (objects) {
            this._data.remove(objects);

            // 매핑되지 않았다면 add, remove를 쓸 수 없음
            if (!this._parent) {
                throw new Error('To remove operation needs a parent instance');
            }

            if (this._isAdded) {
                throw new Error('Save a parent object first to add relation rows');
            }

            this._parent.removeRelation(this._key, objects);
            this._isRemoved = true;
            return this;
        },

        /**
         * 관련된 자료를 가져온다
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        fetch: function (options) {
            return this._data.resetQuery().relatedTo(this._parent, this._key).fetch(options);
        },

        /**
         * 관련되지 않은 자료를 가져온다
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        fetchNotRelated: function (options) {
            return this._data.resetQuery().notRelatedTo(this._parent, this._key).fetch(options);
        }
    });

    /**
     * @static
     * @param {String|Object} name 테이블 이름이나 서버에서 반환받은 객체
     * @param {Baas.Object} [parent] 부모 Object
     * @param {String} [key] 부모 Object의 column 이름
     * @return {Baas.Relation}
     */
    Baas.Relation.create = function (name, parent, key) {
        return new Baas.Relation(name, parent, key);
    };

    /**
     * @static
     * @see Backbone.Model#extend
     */
    Baas.Relation.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    var TYPE = 'Date';

    // polyfill toISOString
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
    if (!Date.prototype.toISOString) {
        (function () {
            function pad(number) {
                var r = String(number);
                if (r.length === 1) {
                    r = '0' + r;
                }
                return r;
            }

            Date.prototype.toISOString = function () {
                return this.getUTCFullYear() + '-' + pad(this.getUTCMonth() + 1) + '-' + pad(this.getUTCDate()) + 'T' + pad(this.getUTCHours()) + ':' + pad(this.getUTCMinutes()) + ':' + pad(this.getUTCSeconds()) + '.' + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) + 'Z';
            };
        }());
    }

    /**
     * Baas에서 사용하는 날짜 형식
     * @class Baas.Date
     * @param {String|Object|Baas.Date|Date} iso ISO8601 문자열이나, Baas에서 반환하는 type 정보가 있는 객체
     */
    Baas.Date = function (iso) {
        if (typeof iso === 'object') {
            if (iso instanceof Date) {
                iso = iso.toISOString();
            } else if (iso instanceof Baas.Date) {
                iso = iso.toString();
            } else if (!iso.__type || iso.__type !== TYPE) {
                throw new Error('Invalid Date type');
            } else {
                iso = iso.iso;
            }

        // Date 객체가 undefined를 넣어도 잘못된 결과를 반환한다
        } else if (typeof iso === 'string') {
            iso = new Date(iso).toISOString();
        } else {
            iso = new Date().toISOString();
        }

        this._iso = iso;
    };

    _.extend(Baas.Date.prototype, /** @lends Baas.Date.prototype */{
        /**
         * @ignore
         */
        toString: function () {
            return this._iso;
        },

        /**
         * @ignore
         */
        toJSON: function () {
            return {
                __type: TYPE,
                iso: this._iso
            };
        }
    });

    /**
     * @static
     * @see Backbone.Model#extend
     */
    Baas.Date.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    var DEFAULT_LIMIT = 100;
    var DEFAULT_SKIP = 0;

    /**
     * Object를 저장하는 테이블
     * 
     * @class Baas.Table
     * @param {Array|Backbone.Model} [models]
     * @param {Object} [options]
     * @param {Boolean} [options.useCount=false] 검색 결과에 갯수를 가져올지 여부
     * @extends {Backbone.Collection}
     */
    Baas.Table = Backbone.Collection.extend(/** @lends Baas.Table.prototype */{
        /**
         * @ignore
         */
        model: Baas.Object,

        /**
         * 테이블 이름
         * @type {String}
         */
        name: '',

        /**
         * @ignore
         */
        url: function () {
            return Baas.URL + '/data/' + this.name;
        },

        /**
         * @ignore
         */
        initialize: function (models, options) {
            this._skip = DEFAULT_SKIP;
            this._limit = DEFAULT_LIMIT;
            this._keys = null;
            this._count = null;
            this._totalCount = null;
            this._useCount = false;
            this._include = null;
            this._or = false;
            this._orPointer = null;
            this._where = null;
            this._wherePointer = null;
            this._query = {};
            this._order = [];
            this._inDistance = null;

            options = options || {};

            if (options.useCount) {
                this._useCount = options.useCount;
            }

            // 테이블을 생성할 때 테이블 이름을 기반으로 model을 재생성
            this.model = this.model.extend({
                name: this.name
            });
        },

        /**
         * @ignore
         */
        parse: function (res) {
            var output = null;

            if (res.results && res.results.length) {
                output = res.results;
            }

            this._totalCount = res.totalCount;
            this._count = res.count;
            return output;
        },

        /**
         * @ignore
         */
        fetch: function (options) {
            var self = this;
            options = options || {};

            // 기본 검색 옵션 포함
            options.data = _.defaults(options.data || {}, {
                limit: this._limit,
                skip: this._skip
            });

            if (this._keys) {
                options.data.keys = this._keys;
            }

            if (this._include) {
                options.data.include = this._include;
            }

            if (this._useCount) {
                options.data.count = this._useCount ? 1 : 0;
            }

            // 쿼리가 있다면 쿼리 조건을 포함
            if (this._query && _.keys(this._query).length) {
                options.data.where = JSON.stringify(this._query);
            }

            if (this._order.length) {
                options.data.order = this._order.join(','); 
            }

            return Backbone.Collection.prototype.fetch.call(this, options).then(function () {
                return self;
            });
        },

        /**
         * 쿼리문을 반환
         *
         * @return {Object}
         */
        getQuery: function () {
            return this._query;
        },

        /**
         * 서버에서 자료를 가져올 떄 Pointer 자료를 포함시켜서 가져온다 
         * 모델을 생성할 때 options에서 설정할 수도 있다
         * 
         * @param {String} key 컬럼 이름
         * @return {Baas.Table}
         */
        include: function (key) {
            this._include = key;
            return this;
        },

        /**
         * 가져올 자료 중 건너뛸 갯수를 설정한다.
         * 
         * @param {Number} [skip=0]
         * @return {Baas.Table}
         */
        skip: function (skip) {
            this._skip = skip || 0;
            return this;
        },

        /**
         * 가져올 자료의 갯수를 설정한다.
         * 
         * @param {Number} [limit=100] 최대 1000까지 설정할 수 있다.
         * @return {Baas.Table}
         */
        limit: function (limit) {
            this._limit = limit || 100;
            return this;
        },

        /**
         * 특정 컬럼만 조회하기를 원할 때 사용한다.
         *
         * ```
         * // name과 age 컬럼만 조회한다.
         * Baas.Table.create('test').keys('name', 'age').fetch();
         * ```
         * 
         * @param {...String} 가져오길 원하는 컬럼을 이어서 쓴다.
         * @return {Baas.Table}
         */
        keys: function () {
            this._keys = arguments.length ? _.toArray(arguments).join(',') : null;
            return this;
        },

        /**
         * 검색 결과 갯수를 가져올지 여부
         * 생성자의 options에서도 설정할 수 있다
         *
         * @param {Boolean} [useCount]
         * @return {Baas.Table}
         */
        useCount: function (useCount) {
            this._useCount = useCount ? true : false;
            return this;
        },

        /**
         * useCount로 얻어온 검색 결과 갯수를 반환한다.
         *
         * @return {Number}
         */
        getCount: function () {
            return this._count || this.length;
        },

        /**
         * 검색 결과의 갯수를 반환
         * useCount 옵션이 true여야 한다
         *
         * @return {Number}
         */
        getTotalCount: function () {
            return this._totalCount || this.length;
        },

        /**
         * Where 쿼리 시작
         *
         * @param {String} [key] Column 이름
         * @return {Baas.Table}
         */
        where: function (key) {
            if (this._or) {
                // 횟수가 제한돼 있고, 감소한 결과가 0이하면 false로 변경
                if (_.isNumber(this._or) && !--this._or) {
                    this._or = false;
                    this._orPointer = null;
                }

                this._query.$or = this._query.$or || [];

                if (!this._orPointer) {
                    this._orPointer = {};
                    this._query.$or.push(this._orPointer);
                }

                this._wherePointer = this._orPointer;
            } else {
                this._wherePointer = this._query;
            }

            this._where = key;
            return this;
        },

        /**
         * or 조건으로 where 쿼리를 묶는다.
         *
         * @param {Number} [whereCount] 정해진 where 갯수만큼만 or절로 묶는다
         * @return {Baas.Table}
         */
        or: function (whereCount) {
            // 이미 or 조건중이었다면 포인터를 초기화함
            if (this._or) {
                this._orPointer = null;
            }

            this._or = whereCount || true;
            return this;
        },

        /**
         * or 조건을 끝낸다
         *
         * @return {Baas.Table}
         */
        endOr: function () {
            this._or = false;
            this._orPointer = null;
            return this;
        },

        /**
         * @private
         * @return {Array}
         */
        _getQuery: function () {
            if (!this._where) {
                throw new Error('Call where() method first');
            }

            this._wherePointer[this._where] = this._wherePointer[this._where] || {};
            return this._wherePointer[this._where];
        },

        /**
         * 같음
         * WHERE 조건이 선행돼야 한다
         * @param {*} value
         * @return {Baas.Table}
         */
        eq: function (value) {
            if (!this._where) {
                throw new Error('Call where() method first');
            }

            this._wherePointer[this._where] = value;
            return this;
        },

        /**
         * @see Baas.Table#eq
         */
        equals: function (value) {
            return this.eq(value);
        },

        /**
         * 미만
         * WHERE 조건이 선행돼야 한다
         * @param {Number} value
         * @return {Baas.Table}
         */
        lt: function (value) {
            this._getQuery().$lt = value;
            return this;
        },

        /**
         * 이하
         * WHERE 조건이 선행돼야 한다
         * @param {Number} value
         * @return {Baas.Table}
         */
        lte: function (value) {
            this._getQuery().$lte = value;
            return this;
        },

        /**
         * 초과
         * WHERE 조건이 선행돼야 한다
         * @param {Number} value
         * @return {Baas.Table}
         */
        gt: function (value) {
            this._getQuery().$gt = value;
            return this;
        },

        /**
         * 이상
         * WHERE 조건이 선행돼야 한다
         * @param {Number} value
         * @return {Baas.Table}
         */
        gte: function (value) {
            this._getQuery().$gte = value;
            return this;
        },

        /**
         * 같지 않음
         * WHERE 조건이 선행돼야 한다
         * @param {*} value
         * @return {Baas.Table}
         */
        ne: function (value) {
            this._getQuery().$ne = value;
            return this;
        },

        /**
         * 포함
         * WHERE 조건이 선행돼야 한다
         * 다음과 같이 자유롭게 쓸 수 있다
         *
         * ```
         * in(1) // 1 포함
         * in([1, 2]) // 1, 2 포함
         * in(1, 2, 3) // 1, 2, 3 포함
         * ```
         * 
         * @param {Array|*} value
         * @return {Baas.Table}
         */
        'in': function (value) {
            if (_.isArray(value)) {
                value = value;
            } else if (arguments.length > 1) {
                value = _.toArray(arguments);
            } else {
                value = [value];
            }

            this._getQuery().$in = value;
            return this;
        },

        /**
         * 포함되지 않음
         * WHERE 조건이 선행돼야 한다
         * 다음과 같이 자유롭게 쓸 수 있다
         *
         * ```
         * in(1) // 1 포함
         * in([1, 2]) // 1, 2 포함
         * in(1, 2, 3) // 1, 2, 3 포함
         * ```
         * 
         * @param {*|Array} value
         * @return {Baas.Table}
         */
        nin: function (value) {
            if (_.isArray(value)) {
                value = value;
            } else if (arguments.length > 1) {
                value = _.toArray(arguments);
            } else {
                value = [value];
            }

            this._getQuery().$nin = value;
            return this;
        },

        /**
         * 값의 존재 여부
         * WHERE 조건이 선행돼야 한다
         * @param {Boolean} value
         * @return {Baas.Table}
         */
        exists: function (value) {
            this._getQuery().$exists = !!value;
            return this;
        },

        /**
         * Array 형식의 Column에서 해당 값을 가지고 있는 행을 검색
         * WHERE 조건이 선행돼야 한다
         * @param {Array} value
         * @return {Baas.Table}
         */
        all: function (value) {
            value = _.isArray(value) ? value : [value];
            this._getQuery().$all = value;
            return this;
        },
        
        /**
         * 시작 문자열 검색
         * 문자열 조건 startWith, endWith, contains는 중복처리되지 않는다
         * WHERE 조건이 선행돼야 한다
         * @param {Array} value
         * @return {Baas.Table}
         */
        startWith: function (value) {
            this._getQuery().$like = {
                __startWith: value
            };
            return this;
        },

        /**
         * 끝 문자열 검색
         * 문자열 조건 startWith, endWith, contains는 중복처리되지 않는다
         * WHERE 조건이 선행돼야 한다
         * @param {Array} value
         * @return {Baas.Table}
         */
        endWith: function (value) {
            this._getQuery().$like = {
                __endWith: value
            };
            return this;
        },

        /**
         * 포함된 문자열 검색
         * WHERE 조건이 선행돼야 한다
         * @param {Array} value
         * @return {Baas.Table}
         */
        contains: function (value) {
            this._getQuery().$like = {
                __contains: value
            };
            return this;
        },

        /**
         * 조합된 쿼리를 초기화한다
         *
         * @return {Baas.Table}
         */
        resetQuery: function () {
            this._skip = DEFAULT_SKIP;
            this._limit = DEFAULT_LIMIT;
            this._keys = null;
            this._or = false;
            this._orPointer = null;
            this._where = null;
            this._wherePointer = null;
            this._query = {};
            this._order = [];
            return this;
        },

        /**
         * MongoDB 쿼리를 직접 조합해 쿼리를 사용할 수 있다.
         *
         * @param {Object} query
         * @return {Baas.Table}
         */
        find: function (query) {
            if (!query || !_.isObject(query) || _.isArray(query)) {
                throw new Error('Query should be a type as object for querying the BaaS Service');
            }

            this._query = query || {};
            return this;
        },

        /**
         * 오름차순 정렬
         *
         * @param {String} key Column 이름
         * @return {Baas.Table}
         */
        ascending: function (key) {
            this._order.push(key);
            return this;
        },

        /**
         * 내림차순 정렬
         *
         * @param {String} key Column 이름
         * @return {Baas.Table}
         */
        descending: function (key) {
            this._order.push('-' + key);
            return this;
        },

        /**
         * 정렬만 초기화한다
         *
         * @return {Baas.Table}
         */
        resetOrder: function () {
            this._order = [];
            return this;
        },

        /**
         * 쿼리가 설정된 Baas.Table 인스턴스를 이용해 서브쿼리를 사용할 수 있다.
         * 해당 쿼리 결과를 포함하는 조건을 검색한다.
         * WHERE 조건이 선행돼야 한다
         *
         * @param {Baas.Table} table
         * @param {String} targetColumnName 대상 테이블에서 가져울 값의 컬럼 이름
         * @return {Baas.Table}
         */
        select: function (table, targetColumnName) {
            this._getQuery().$select = this._makeSelectQuery(table, targetColumnName);
            return;
        },

        /**
         * 쿼리가 설정된 Baas.Table 인스턴스를 이용해 서브쿼리를 사용할 수 있다.
         * 해당 쿼리 결과를 포함하지 않는 조건을 검색한다.
         * WHERE 조건이 선행돼야 한다
         *
         * @param {Baas.Table} table
         * @param {String} targetColumnName 대상 테이블에서 가져울 값의 컬럼 이름
         * @return {Baas.Table}
         */
        dontSelect: function (table, targetColumnName) {
            this._getQuery().$dontSelect = this._makeSelectQuery(table, targetColumnName);
            return;
        },

        /**
         * @private
         */
        _makeSelectQuery: function (table, targetColumnName) {
            var query = table.getQuery();

            if (!_.keys(query).length) {
                throw new Error('Set query on target table first');
            }

            return {
                dataName: table.name,
                where: query,
                key: targetColumnName
            };
        },

        /**
         * Relation 으로 설정된 컬럼의 데이터를 조건으로 검색할 수 있다.
         *
         * @param {String} key relation 타입인 현재 테이블의 컬럼 이름
         * @param {Baas.Table} table 쿼리 조건이 설정된 테이블 인스턴스
         * @return {Baas.Table}
         */
        inQuery: function (key, table) {
            this._query.$inQuery = this._makeInQuery(key, table);
            return this;
        },

        /**
         * Relation 으로 설정된 컬럼의 데이터를 포함하지 않는 조건으로 검색할 수 있다.
         *
         * @param {String} key relation 타입인 현재 테이블의 컬럼 이름
         * @param {Baas.Table} table table 쿼리 조건이 설정된 테이블 인스턴스
         * @return {Baas.Table}
         */
        notInQuery: function (key, table) {
            this._query.$notInQuery = this._makeInQuery(key, table);
            return this;
        },

        /**
         * @private
         */
        _makeInQuery: function (key, table) {
            return {
                query: {
                    where: table.getQuery(),
                    dataName: table.name
                },
                key: key
            };
        },

        /**
         * 특정 object와 연관된 Relation 데이터를 검색한다
         *
         * @param {Baas.Object} object
         * @param {String} key relation 타입인 대상 객체의 컬럼 이름
         * @return {Baas.Table}
         */
        relatedTo: function (object, key) {
            this._query.$relatedTo = this._makeRelatedTo(object, key);
            return this;
        },

        /**
         * 특정 object와 연관되지 않은 Relation 데이터를 검색한다
         *
         * @param {Baas.Object} object
         * @param {String} key relation 타입인 대상 객체의 컬럼 이름
         * @return {Baas.Table}
         */
        notRelatedTo: function (object, key) {
            this._query.$notRelatedTo = this._makeRelatedTo(object, key);
            return this;
        },

        /**
         * @private
         */
        _makeRelatedTo: function (object, key) {
            return {
                object: {
                    __type: 'Relation',
                    dataName: object.name,
                    objectId: object.get('objectId')
                },
                key: key
            };
        },

        /**
         * GeoPoint를 이용해서 가까이에 있는 데이터를 조회 
         * WHERE 조건이 선행돼야 한다
         * @param {Baas.GeoPoint|Number} lat 위도 혹은, Baas.GeoPoint 인스턴스
         * @param {Number} [lng] 경도
         * @return {Baas.Table}
         */
        near: function (lat, lng) {
            var point = new Baas.GeoPoint(lat, lng);
            var query = this._getQuery();

            query.$nearSphere = point.toJSON();

            if (this._inDistance) {
                query = _.extend(query, this._inDistance);
            }

            return this;
        },

        /**
         * 최대 거리를 마일로 지정
         * near 조건과 같이 써야 한다
         * @param {Number} mile
         * @return {Baas.Table}
         */
        inMiles: function (mile) {
            this._maxDistance('$maxDistanceInMiles', mile);
            return this;
        },

        /**
         * 최대 거리를 킬로미터로 지정
         * near 조건과 같이 써야 한다
         * @param {Number} kilometer
         * @return {Baas.Table}
         */
        inKilometers: function (kilometer) {
            this._maxDistance('$maxDistanceInKilometers', kilometer);
            return this;
        },

        /**
         * 최대 거리를 radian으로 지정
         * near 조건과 같이 써야 한다
         * @param {Number} radian
         * @return {Baas.Table}
         */
        inRadians: function (radian) {
            this._maxDistance('$maxDistanceInRadians', radian);
            return this;
        },

        /**
         * @private
         */
        _maxDistance: function (key, distance) {
            var query = this._getQuery();
            var where = {};
            where[key] = distance;
            
            if (query.$nearSphere) {
                query = _.extend(query, where);
            } else {
                this._inDistance = where;
            }
        },

        /**
         * 양 끝 점의 boundary 범위를 지정
         * 남서, 북동 순서로 기입해야 하며, GeoPoint 입력 가능
         * WHERE 조건이 선행돼야 한다
         * @param {Number|Baas.GeoPoint} latSouthWest 남서 위도 혹은 남서의 GeoPoint
         * @param {Number|Baas.GeoPoint} lngSouthWest 남서 경도 혹은 북동의 GeoPoint
         * @param {Number} [latNorthEast] 북동 위도
         * @param {Number} [lngNorthEast] 북동 경도
         * @return {Baas.Table}
         */
        within: function (latSouthWest, lngSouthWest, latNorthEast, lngNorthEast) {
            var sw = null;
            var ne = null;

            if (arguments.length === 2 &&
                    (latSouthWest instanceof Baas.GeoPoint) &&
                    (lngSouthWest instanceof Baas.GeoPoint)) {
                sw = latSouthWest;
                ne = lngSouthWest;
            } else {
                sw = new Baas.GeoPoint(latSouthWest, lngSouthWest);
                ne = new Baas.GeoPoint(latNorthEast, lngNorthEast);
            }

            this._getQuery().$geoWithin = {
                '$box': [sw.toJSON(), ne.toJSON()]
            };

            return this;
        }
    });

    /**
     * 테이블 이름이 매핑된 Baas.Table 클래스를 생성한다.
     * 
     * @static
     * @param {String} name 테이블 이름
     * @param {Array|Baas.Object} [models] Backbone.Collection의 models
     * @param {Object} [options] Backbone.Model의 options
     * @return {Baas.Table} 테이블 이름이 매핑된 Baas.Table 인스턴스
     */
    Baas.Table.create = function (name, models, options) {
        return new (Baas.Table.extend({
            name: name
        }))(models, options);
    };

    /**
     * @static 
     * @see Backbone.Collection#extend
     */
    Baas.Table.extend = Backbone.Collection.extend;
})(Baas);
(function (Baas) {
    var _me = null;
    var _canUseLocalStorage = typeof localStorage !== 'undefined';
    var SAVED_USER_KEY = '__baas_current_user';

    /**
     * 임의의 유저를 현재 유저로 설정한다
     * @private
     * @param {Baas.User} user
     */
    var _setMe = function (user) {
        _me = user;

        // 삭제되면 로그아웃 상태로 돌아가도록 수정
        _me.listenToOnce(_me, 'destroy', _unsetMe);

        // localStorage 사용이 가능하면 토큰을 저장함
        _saveMe();
        
        if (_canUseLocalStorage) {
            // 정보가 바뀌면, localStorage에 저장된 정보고 변경되게 수정
            _me.listenTo(_me, 'change', _saveMe);
        }
    };

    /**
     * @private
     */
    var _saveMe = function () {
        if (_canUseLocalStorage) {
            localStorage.setItem(SAVED_USER_KEY, JSON.stringify(_me.attributes));
        }
    };

    /**
     * @private
     * @return {Baas.User}
     */
    var _loadMe = function () {
        if (_canUseLocalStorage) {
            return new Baas.User(JSON.parse(localStorage.getItem(SAVED_USER_KEY)));
        } else {
            return null;
        }
    };

    /**
     * @private
     */
    var _removeSavedData = function () {
        if (_canUseLocalStorage) {
            localStorage.removeItem(SAVED_USER_KEY);
        }
    };

    /**
     * 현재 유저를 해제한다
     * @private
     */
    var _unsetMe = function () {
        if (_me) {
            _me.stopListening(_me);
        }

        _me = null;

        // localStorage 사용이 가능하면 토큰을 저장함
        _removeSavedData();
    };

    /**
     * @class Baas.User
     * @extends {Baas.Object}
     */
    Baas.User = Baas.Object.extend(/** @lends Baas.User.prototype */{
        /**
         * @ignore
         */
        name: 'User',

        /**
         * @ignore
         * @override
         */
        urlRoot: function () {
            return Baas.URL + '/users';
        },

        /**
         * @ignore
         * @override
         */
        toJSON: function () {
            var data = Baas.Object.prototype.toJSON.apply(this, arguments);

            // 직접 수정할 수 없는 값 제거
            delete data.sessionToken;
            delete data.emailVerified;
            
            return data;
        },

        /**
         * @ignore
         * @override
         */
        parse: function (res) {
            // 세션 토큰이 있다면, 현재 유저를 me로 본다
            if (res.sessionToken) {
                _setMe(this);
            }

            return Baas.Object.prototype.parse.apply(this, arguments);
        },

        /**
         * 회원 가입
         *
         * ```
         * var user = new Baas.User({
         *     name: 'testUser',
         *     password: 'testPassword'
         * });
         *
         * user.signIn();
         * ```
         *
         * @see Backbone.Model#save
         * @return {Promise}
         */
        signIn: function (key, val, options) {
            return this.save(key, val, options);
        },

        /**
         * 현재 유저로 로그인한다
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        logIn: function (options) {
            options = _.defaults(options || {}, {
                url: Baas.URL + '/login',
                data: {
                    username: this.get('username'),
                    password: this.get('password')
                }
            });

            return this.fetch(options);
        },

        /**
         * 이 사용자가 로그인을 했는지 여부를 반환
         *
         * @return {Boolean}
         */
        isLoggedIn: function () {
            return !!this.get('sessionToken');
        },

        /**
         * 가입 인증 메일을 발송한다
         * 현재 모델에 이메일 정보가 없을 경우에 에러가 발생한다.
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        sendVerifyEmail: function (options) {
            var self = this;
            options = options || {};

            // 아직 이메일 정보가 없을 경우에는 에러
            if (!this.get('email')) {
                if (options.error) {
                    options.error(this);
                }

                return Q.reject();
            }

            return Backbone.ajax({
                url: Baas.URL + '/verifyemail',
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify({
                    email: this.get('email')
                }),
                success: function (res, statusText, xhr) {
                    if (options.success) {
                        options.success(self, xhr, options);
                    }
                },
                error: function (xhr) {
                    if (options.error) {
                        options.error(self, xhr, options);
                    }
                }
            });
        },

        /**
         * 비밀번호 재설정 이메일을 발송한다
         * 현재 모델에 이메일 정보가 없을 경우에 에러가 발생한다.
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        sendResetPasswordEmail: function (options) {
            var self = this;
            options = options || {};

            // 아직 이메일 정보가 없을 경우에는 에러
            if (!this.get('email')) {
                if (options.error) {
                    options.error(this);
                }

                return Q.reject();
            }

            return Backbone.ajax({
                url: Baas.URL + '/resetpassword',
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify({
                    email: this.get('email')
                }),
                success: function (res, statusText, xhr) {
                    if (options.success) {
                        options.success(self, xhr, options);
                    }
                },
                error: function (xhr) {
                    if (options.error) {
                        options.error(self, xhr, options);
                    }
                }
            });
        },

        /**
         * 페이스북 계정을 연결
         *
         * @param {Object} attributes
         * @param {String} attributes.userID FB.getLoginStatus에서 authResponse.id 값
         * @param {String} attributes.accessToken FB.getLoginStatus에서 authResponse.accessToken 값
         * @param {String} attributes.expiresIn FB.getLoginStatus에서 authResponse.expirationDate 값
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        linkFacebook: function (attributes, options) {
            var authData = this.get('authData');
            attributes = attributes || {};

            authData = _.defaults({
                facebook: {
                    id: attributes.userID,
                    accessToken: attributes.accessToken,
                    expirationDate: new Date(attributes.expiresIn * 1000 + (new Date()).getTime()).toJSON()
                }
            }, authData || {});

            return this.save({
                authData: authData
            }, options);
        },

        /**
         * 페이스북 계정을 연결 해제
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        unlinkFacebook: function (options) {
            var authData = this.get('authData');

            authData = _.defaults({
                facebook: null
            }, authData || {});

            return this.save({
                authData: authData
            }, options);
        },

        /**
         * 페이스북 계정이 연결됐는지 여부
         *
         * @return {Boolean}
         */
        isLinkedFacebook: function () {
            var authData = this.get('authData');
            return authData && authData.facebook;
        },

        /**
         * 트위터 계정을 연결
         *
         * @param {Object} attributes
         * @param {String} attributes.id
         * @param {String} attributes.screenName
         * @param {String} attributes.consumerKey
         * @param {String} attributes.consumerSecret
         * @param {String} attributes.authToken
         * @param {String} attributes.authTokenSecret
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        linkTwitter: function (attributes, options) {
            var authData = this.get('authData');
            attributes = attributes || {};

            authData = _.defaults({
                twitter: {
                    id: attributes.id,
                    screenName: attributes.screenName,
                    consumerKey: attributes.consumerKey,
                    consumerSecret: attributes.consumerSecret,
                    authToken: attributes.authToken,
                    authTokenSecret: attributes.authTokenSecret
                }
            }, authData || {});

            return this.save({
                authData: authData
            }, options);
        },

        /**
         * 트위터 계정을 연결 해제
         * 
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        unlinkTwitter: function (options) {
            var authData = this.get('authData');

            authData = _.defaults({
                twitter: null
            }, authData || {});

            return this.save({
                authData: authData
            }, options);
        },

        /**
         * 트위터 계정이 연결됐는지 여부
         *
         * @return {Boolean}
         */
        isLinkedTwitter: function () {
            var authData = this.get('authData');
            return authData && authData.twitter;
        }
    });

    /**
     * 현재 유저를 반환
     * - 페이지가 처음 로드되고, 저장된 사용자 정보가 있다면, 메서드 호출 시 저장된 사용자 정보를 반환
     * - 페이지가 처음 로드된 후 메서드를 한 번 이상 실행한 이후부터는 저장된 사용자 정보를 이용해 API를 호출한다.
     *
     * ```
     * var me = Baas.User.getMe();
     *
     * // 현재 사용자 정보를 이용해 API를 호출한다.
     * Baas.Object.create('book', {
     *     name: 'The Judge'
     * }).save();
     * ```
     * @static
     * @return {Baas.User}
     */
    Baas.User.getMe = function () {
        if (!_me) {
            // 저장된 사용자 정보가 있다면 복원
            _me = _loadMe();
        }

        return _me;
    };

    /**
     * 현재 로그인됐는지 여부를 반환
     * @static
     * @return {Boolean}
     */
    Baas.User.isLoggedIn = function () {
        return _me && _me.isLoggedIn();
    };

    /**
     * 현재 사용자를 로그아웃 한다.
     * 저장된 정보가 있다면, 저장된 정보도 삭제한다.
     * @static
     */
    Baas.User.logOut = function () {
        _unsetMe();
    };

    /**
     * 로그인
     * @static
     * @param {String} username 사용자 이름
     * @param {String} password 비밀번호
     * @param {Object} [options]
     * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
     * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
     * @return {Promise} 생성된 사용자 인스턴스를 반환
     */
    Baas.User.logIn = function (username, password, options) {
        options = options || {};

        var user = new Baas.User({
            username: username,
            password: password
        });

        return user.logIn(options);
    };

    /**
     * 새로운 유저 인스턴스를 생성한다.
     * 
     * @static
     * @param {Object} [attributes]
     * @param {Object} [options]
     * @return {Baas.User}
     * @see Backbone.Model
     */
    Baas.User.create = function (attributes, options) {
        return new Baas.User(attributes, options);
    };

    /**
     * 페이스북 계정을 연결
     * 
     * @static
     * @see Baas.User#linkFacebook
     * @return {Promise} 생성된 인스턴스를 인자로 받음
     */
    Baas.User.linkFacebook = function (attributes, options) {
        var user = new Baas.User();

        return user.linkFacebook(attributes, options).then(function () {
            return user;
        });
    };

    /**
     * 트위터 계정을 연결
     * 
     * @static
     * @see Baas.User#linkTwitter
     * @return {Promise} 생성된 인스턴스를 인자로 받음
     */
    Baas.User.linkTwitter = function (attributes, options) {
        var user = new Baas.User();

        return user.linkTwitter(attributes, options).then(function () {
            return user;
        });
    };

    /**
     * @static 
     * @see Backbone.Model#extend
     */
    Baas.User.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    /**
     * @class Baas.Users
     * @extends {Baas.Table}
     */
    Baas.Users = Baas.Table.extend(/** @lends Baas.Users.prototype */{
        /**
         * @ignore
         */
        name: 'User',

        /**
         * @ignore
         */
        model: Baas.User,

        /**
         * @ignore
         */
        url: function () {
            return Baas.URL + '/users';
        }
    });

    /**
     * @static
     * @param {Array} [models]
     * @param {Object} [options]
     * @return {Baas.Users}
     * @see Backbone.Collection
     */
    Baas.Users.create = function (models, options) {
        return new Baas.Users(models, options);
    };

    /**
     * @static 
     * @see Backbone.Collection#extend
     */
    Baas.Users.extend = Backbone.Collection.extend;
})(Baas);
(function (Baas) {
    /**
     * @class Baas.Role
     * @extends {Baas.Object}
     */
    Baas.Role = Baas.Object.extend(/** @lends Baas.Role.prototype */{
        /**
         * @ignore
         */
        name: 'Role',

        /**
         * @ignore
         * @override
         */
        urlRoot: function () {
            return Baas.URL + '/roles';
        },

        /**
         * @ignore
         * @override
         */
        initialize: function () {
            Baas.Object.prototype.initialize.apply(this, arguments);

            if (!this.get('users')) {
                this.set('users', new Baas.Relation(new Baas.Users(), this, 'users'));
            }

            if (!this.get('roles')) {
                this.set('roles', new Baas.Relation(new Baas.Roles(), this, 'roles'));
            }

            if (!this.get('ACL')) {
                this.set('ACL', new Baas.Acl());
            }
        },

        /**
         * @return {Baas.Acl}
         */
        getAcl: function () {
            return this.get('ACL');
        },

        /**
         * 사용자 Relation을 반환한다
         *
         * @return {Baas.Relation}
         */
        getUsers: function () {
            return this.get('users');
        },

        /**
         * Role Relation을 반환한다
         *
         * @return {Baas.Relation}
         */
        getRoles: function () {
            return this.get('roles');
        }
    });

    /**
     * @static
     * @param {String} [attributes]
     * @param {String} [options]
     * @return {Baas.Role}
     * @see Backbone.Model
     */
    Baas.Role.create = function (attributes, options) {
        return new Baas.Role(attributes, options);
    };

    /**
     * @static 
     * @see Backbone.Model#extend
     */
    Baas.Role.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    /**
     * @class Baas.Roles
     * @extends {Baas.Table}
     */
    Baas.Roles = Baas.Table.extend(/** @lends Baas.Roles.prototype */{
        /**
         * @ignore
         */
        name: 'Role',

        /**
         * @ignore
         */
        model: Baas.Role,

        /**
         * @ignore
         */
        url: function () {
            return Baas.URL + '/roles';
        }
    });

    /**
     * @static
     * @param {Array} [models]
     * @param {Object} [options]
     * @return {Baas.Roles}
     * @see Backbone.Collection
     */
    Baas.Roles.create = function (models, options) {
        return new Baas.Roles(models, options);
    };

    /**
     * @static 
     * @see Backbone.Collection#extend
     */
    Baas.Roles.extend = Backbone.Collection.extend;
})(Baas);
(function (Baas) {
    var LOG_TYPE = {
        SYSTEM: 'system',
        CUSTOM: 'custom'
    };

    var DEVICE_TYPE = {
        ANDROID: 'android',
        IOS: 'ios',
        WEB: 'web'
    };

    /**
     * 로그를 기록하는 기능
     * 개발자 포털에서 로그 사용 설정이 돼있어야 한다
     *
     * @namespace
     * @example
     * 
     * ```
     * Baas.Log('에러입니다'); // 코드가 없는 경우 화면에만 노출한다
     * Baas.Log('에러입니다', '9444'); // 코드를 임의로 입력할 수 있다. 이 경우, 로그가 서버에 기록된다.
     *
     * // 객체를 이용해 다양한 값을 설정할 수 있다
     * Baas.Log({
     *     code: '1234',
     *     message: '에러입니다'
     * });
     * ```
     * 
     * @param {String|Object} message 메세지나 로그 객체를 통해 다양한 옵션을 설정할 수 있다
     * @param {String} [message.code]
     * @param {String} [message.message]
     * @param {String} [message.logType]
     * @param {String} [message.deviceType]
     * @param {String} [message.reqMethod]
     * @param {String} [message.reqURI]
     * @param {Object} [message.reqBody]
     * @param {String} [message.statusCode]
     * @param {String} [code]
     * @param {Object} [options]
     * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
     * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
     * @return {Promise}
     */
    Baas.Log = function (message, code, options) {
        var attributes;
        options = options || {};

        if (typeof message === 'object') {
            options = code;
            attributes = message;
        } else {
            attributes = {
                message: message,
                code: code
            };
        }

        // 화면에 노출
        console.log((attributes.code ? '[' + attributes.code + '] ' : '') + attributes.message);

        // 코드가 없는 경우 종료
        if (!attributes.code) {
            return Q.resolve();
        }

        attributes = _.defaults(attributes, {
            logType: LOG_TYPE.CUSTOM,
            deviceType: DEVICE_TYPE.WEB
        });

        return Backbone.ajax({
            url: Baas.URL + '/logs',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(attributes),
            success: options.success,
            error: options.error
        });
    };

    /**
     * @static
     * @type {Object}
     */
    Baas.Log.DEVICE_TYPE = DEVICE_TYPE;

    /**
     * @static
     * @type {Object}
     */
    Baas.Log.LOG_TYPE = LOG_TYPE;
})(Baas);
(function (Baas) {
    /**
     * @class Baas.File
     * @extends {Baas.Object}
     */
    Baas.File = Baas.Object.extend(/** @lends Baas.File.prototype */{
        /**
         * @ignore
         */
        name: 'File',

        /**
         * @ignore
         */
        idAttribute: 'name',

        /**
         * @ignore
         * @override
         */
        urlRoot: function () {
            return Baas.URL + '/files';
        }
    });

    /**
     * @static
     * @param {jQuery} $file `<input type="file">` 엘리먼트
     * @param {Object} [options]
     * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
     *                                     첫 번째 인자로 생성된 Baas.File 인스턴스를 배열로 받는다.
     * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
     * @return {Promise} 생성된 Baas.File 인스턴스를 배열로 받는다.
     */
    Baas.File.upload = function ($file, options) {
        var el = $file instanceof jQuery ? $file[0] : $file;
        var files = [];
        options = options || {};

        return Q.all(_.map(el.files, function (file) {
            var data = new FormData();
            data.append('uploadfile', file);

            return Backbone.ajax({
                url: Baas.URL + '/files',
                data: data,
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false
            }).then(function (data) {
                if (data) {
                    files.push(new Baas.File(data));
                }
            });
        })).then(function () {
            if (options.success) {
                options.success(files);
            }

            return files;
        }).fail(function (reason) {
            if (options.error) {
                options.error(reason);
            }

            return Q.reject(reason);
        });
    };

    /**
     * @static
     * @param {Object} [attributes]
     * @param {Object} [options]
     * @return {Baas.File}
     * @see Backbone.Model
     */
    Baas.File.create = function (attributes, options) {
        return new Baas.File(attributes, options);
    };

    /**
     * @static 
     * @see Backbone.Model#extend
     */
    Baas.File.extend = Backbone.Model.extend;
})(Baas);
(function (Baas) {
    /**
     * @class Baas.Files
     * @extends {Baas.Table}
     */
    Baas.Files = Baas.Table.extend(/** @lends Baas.Files.prototype */{
        /**
         * @ignore
         */
        name: 'File',

        /**
         * @ignore
         */
        model: Baas.File,

        /**
         * @ignore
         */
        url: function () {
            return Baas.URL + '/files';
        }
    });

    /**
     * @static
     * @param {Array} [models]
     * @param {Object} [options]
     * @return {Baas.Files}
     * @see Backbone.Collection
     */
    Baas.Files.create = function (models, options) {
        return new Baas.Files(models, options);
    };

   /**
     * @static 
     * @see Backbone.Collection#extend
     */
    Baas.Files.extend = Backbone.Collection.extend;
})(Baas);
(function (Baas) {
    /**
     * 위치를 나타내는 Object의 자료형
     * 위도는 -90~90, 경도는 -180~180까지의 float 값을 갖는다.
     *
     * GeoPoint를 이용해 Baas.Table의 `near()`, within()` 조건을 사용할 수 있다.
     * 
     * @class
     * @extends Backbone.Events
     * @param {Number|Object} lat 위도 혹은 위경도가 포함된 객체
     * @param {Number} [lng] 경도
     */
    Baas.GeoPoint = function (lat, lng) {
        this._latitude = 0;
        this._longitude = 0;
        
        if (lng) {
            this._latitude = parseFloat(lat);
            this._longitude = parseFloat(lng);
        } else if (lat) {
            if (lat instanceof Baas.GeoPoint) {
                this._latitude = parseFloat(lat.toString().latitude);
                this._longitude = parseFloat(lat.toString().longitude);
            } else {
                this._latitude = parseFloat(lat.latitude);
                this._longitude = parseFloat(lat.longitude);
            }
        }
    };

    _.extend(Baas.GeoPoint.prototype, Backbone.Events, /** @lends Baas.GeoPoint.prototype */{
        /**
         * @ignore
         */
        toJSON: function () {
            return {
                latitude: this._latitude,
                longitude: this._longitude
            };
        },

        /**
         * 위도를 반환
         *
         * @return {Number}
         */
        getLatitude: function () {
            return this._latitude;
        },

        /**
         * 경도를 반환
         *
         * @return {Number}
         */
        getLongitude: function () {
            return this._longitude;
        },

        /**
         * 위도를 설정 
         *
         * @param {Number} lat
         * @return {Baas.GeoPoint}
         */
        setLatitude: function (lat) {
            this._latitude = parseFloat(lat);
            return this;
        },

        /**
         * 경도를 설정 
         *
         * @param {Number} lng
         * @return {Baas.GeoPoint}
         */
        setLongitude: function (lng) {
            this._longitude = parseFloat(lng);
            return this;
        }
    });

    /**
     * @static
     * @param {Number} lat 위도
     * @param {Number} lng 경도
     * @return {Baas.GeoPoint}
     */
    Baas.GeoPoint.create = function (lat, lng) {
        return new Baas.GeoPoint(lat, lng);
    };

    /**
     * @static
     * @see Backbone.Model#extend
     */
    Baas.GeoPoint.extend = Backbone.Model.extend;

    /**
     * @ignore
     */
    Baas.GeoPoint.keys = [
        'latitude',
        'longitude'
    ];
})(Baas);
(function (Baas) {
    /**
     * @class
     * @extends {Backbone.Events}
     */
    Baas.Batches = function () {
        this._requests = [];
    };

    _.extend(Baas.Batches.prototype, Backbone.Events, /** @lends Baas.Batches.prototype */{
        url: Baas.URL + '/batches',

        /**
         * PUT 배치를 추가
         *
         * @param {String} path `/`로 시작하는 경로
         * @param {Object} body
         * @return {Baas.Batches}
         */
        put: function (path, body) {
            this._add('PUT', path, body);
            return Baas.Batches;
        },

        /**
         * POST 배치를 추가
         *
         * @param {String} path `/`로 시작하는 경로
         * @param {Object} body
         * @return {Baas.Batches}
         */
        post: function (path, body) {
            this._add('POST', path, body);
            return Baas.Batches;
        },

        /**
         * DELETE 배치를 추가
         *
         * @param {String} path `/`로 시작하는 경로
         * @param {Object} body
         * @return {Baas.Batches}
         */
        'delete': function (path, body) {
            this._add('DELETE', path, body);
            return Baas.Batches;
        },

        /**
         * 배치를 초기화
         * @return {Baas.Batches}
         */
        reset: function () {
            this._requests = [];
            return Baas.Batches;
        },

        /**
         * 특정 함수를 실행할 동안, 호출된 ajax를 가로채서 배치 작업으로 추가한다.
         */
        addRequests: function (triggerFunction) {
            var ajax = Backbone.ajax;
            var requests = [];

            // 임시저장
            Backbone.ajax = function (requestOption) {
                requests.push(requestOption);
                return Q.resolve();
            };

            triggerFunction();

            // 복구
            Backbone.ajax = ajax;

            _.each(requests, function (request) {
                var type = request.type.toLowerCase();

                if (this[type]) {
                    this[type](request.url, request.data);
                }
            }, this);
        },

        /**
         * @private
         */
        _add: function (method, path, body) {
            // 도메인을 떼어내기
            path = path.replace(Baas.ROOT_URL, '');

            this._requests.push({
                path: path,
                method: method,
                body: body
            });
        },

        /**
         * 요청을 보냄
         *
         * @param {Object} [options]
         * @param {Function} [options.success] Promise를 사용하지 않을경우, 성공했을 때 콜백
         * @param {Function} [options.error] Promise를 사용하지 않을 경우, 실패했을 때 콜백
         * @return {Promise}
         */
        request: function (options) {
            options = options || {};

            if (!this._requests.length) {
                if (options.success) {
                    options.success();
                }

                return Q.resolve();
            }

            return Backbone.ajax({
                url: this.url,
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    requests: this._requests
                }),
                success: options.success,
                error: options.error
            });
        }
    });
})(Baas);
/* jshint ignore:start */
return Baas;
}, this);
/* jshint ignore:end */

if (typeof exports !== 'undefined') {
	exports.Baas = this.Baas;
};