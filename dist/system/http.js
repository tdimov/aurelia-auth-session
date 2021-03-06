System.register(['aurelia-http-client', 'jquery', 'aurelia-dependency-injection', './session', './logger', './locale', './config', './loadingMask/loadingMask'], function (_export) {
  'use strict';

  var HttpClient, $, inject, Session, Logger, Locale, Config, LoadingMask, Http;

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_aureliaHttpClient) {
      HttpClient = _aureliaHttpClient.HttpClient;
    }, function (_jquery) {
      $ = _jquery['default'];
    }, function (_aureliaDependencyInjection) {
      inject = _aureliaDependencyInjection.inject;
    }, function (_session) {
      Session = _session.Session;
    }, function (_logger) {
      Logger = _logger.Logger;
    }, function (_locale) {
      Locale = _locale.Locale;
    }, function (_config) {
      Config = _config.Config;
    }, function (_loadingMaskLoadingMask) {
      LoadingMask = _loadingMaskLoadingMask.LoadingMask;
    }],
    execute: function () {
      Http = (function () {
        function Http(session, logger, loadingMask) {
          _classCallCheck(this, _Http);

          this.session = session;
          this.logger = logger;
          this.loadingMask = loadingMask;
          this.authHttp = undefined;
          this.locale = Locale.Repository['default'];

          this.requestsCount = 0;
          this.host = Config.httpOpts.serviceHost;
          this.origin = this.host + Config.httpOpts.serviceApiPrefix;
          this.authOrigin = Config.httpOpts.authHost;
          this.hosts = Config.httpOpts.hosts || {};
          this.requestTimeout = Config.httpOpts.requestTimeout;

          if (this.session.userRemembered()) {
            this.initAuthHttp(this.session.rememberedToken());
          }
        }

        Http.prototype._showLoadingMask = function _showLoadingMask() {
          this.requestsCount += 1;
          this.loadingMask.show();
        };

        Http.prototype._hideLoadingMask = function _hideLoadingMask() {
          this.requestsCount -= 1;
          if (this.requestsCount === 0) {
            this.loadingMask.hide();
          } else if (this.requestsCount < 0) {
            throw new Exception('Ups... This should never happend! Fix it Luke!');
          }
        };

        Http.prototype.get = function get(url, data) {
          var _this = this;

          this._showLoadingMask();
          var urlWithProps = url;
          if (data !== undefined) {
            var props = Object.keys(data).map(function (key) {
              return '' + key + '=' + data[key];
            }).join('&');

            urlWithProps += '?' + props;
          }
          var promise = this.authHttp.get(urlWithProps).then(function (response) {
            _this._hideLoadingMask();
            return JSON.parse(response.response);
          });
          promise['catch'](this.errorHandler.bind(this));
          return promise;
        };

        Http.prototype.post = function post(url) {
          var _this2 = this;

          var content = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          this._showLoadingMask();
          var promise = this.authHttp.post(url, content).then(function (response) {
            _this2._hideLoadingMask();
            if (response.response !== '') {
              return JSON.parse(response.response);
            }
          });
          promise['catch'](this.errorHandler.bind(this));

          return promise;
        };

        Http.prototype.put = function put(url) {
          var _this3 = this;

          var content = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

          this._showLoadingMask();
          var promise = this.authHttp.put(url, content).then(function (response) {
            return _this3._hideLoadingMask();
          });
          promise['catch'](this.errorHandler.bind(this));
          return promise;
        };

        Http.prototype['delete'] = function _delete(url) {
          var _this4 = this;

          var promise = this.authHttp['delete'](url).then(function (response) {
            return _this4._hideLoadingMask();
          });
          promise['catch'](this.errorHandler.bind(this));
          return promise;
        };

        Http.prototype.multipartFormPost = function multipartFormPost(url, data) {
          var requestUrl = this.origin + url;
          return this.multipartForm(requestUrl, data, 'POST');
        };

        Http.prototype.multipartFormPut = function multipartFormPut(url, data) {
          var requestUrl = this.origin + url;
          return this.multipartForm(requestUrl, data, 'PUT');
        };

        Http.prototype.multipartForm = function multipartForm(url, data, method) {
          this._showLoadingMask();
          var self = this;
          var req = $.ajax({
            url: url,
            data: data,
            processData: false,
            contentType: false,
            type: method,
            headers: {
              'Authorization': 'Bearer ' + this.token
            }
          });

          return new Promise(function (resolve, reject) {
            req.done(resolve);
            req.fail(reject);
            self._hideLoadingMask();
          })['catch'](this.errorHandler.bind(this));
        };

        Http.prototype.postDownloadFile = function postDownloadFile(url, data) {
          return this.downloadFile(url, 'POST', data);
        };

        Http.prototype.getDownloadFile = function getDownloadFile(url) {
          return this.downloadFile(url, 'GET');
        };

        Http.prototype.downloadFile = function downloadFile(url, method, data) {
          var _this5 = this;

          this._showLoadingMask();
          var urlAddress = this.origin + url;
          var authHeaderValue = 'Bearer ' + this.token;
          var promise = new Promise(function (resolve, reject) {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open(method, urlAddress, true);
            xmlhttp.timeout = _this5.requestTimeout;
            xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xmlhttp.setRequestHeader('Authorization', authHeaderValue);
            xmlhttp.responseType = 'blob';

            xmlhttp.onload = function (oEvent) {
              if (this.status !== 200) {
                reject({ statusCode: this.status });
                return;
              }

              var blob = xmlhttp.response;
              var windowUrl = window.URL || window.webkitURL;
              var url = windowUrl.createObjectURL(blob);
              var filename = this.getResponseHeader('Content-Disposition').match(/^attachment; filename=(.+)/)[1];

              var anchor = $('<a></a>');
              anchor.prop('href', url);
              anchor.prop('download', filename);
              $('body').append(anchor);
              anchor.get(0).click();
              windowUrl.revokeObjectURL(url);
              anchor.remove();
            };

            xmlhttp.ontimeout = function () {
              reject({ timeout: true });
            };

            xmlhttp.addEventListener('error', function () {
              reject();
            });
            xmlhttp.addEventListener('load', function () {
              resolve();
              _this5._hideLoadingMask();
            });
            if (method === 'GET') {
              xmlhttp.send();
            } else if (method === 'POST') {
              xmlhttp.send(JSON.stringify(data));
            } else {
              throw new Error('Unsuported method call!');
            }
          });

          promise['catch'](this.errorHandler.bind(this));
          return promise;
        };

        Http.prototype.loginBasicAuth = function loginBasicAuth(email, pass) {
          var client = new HttpClient();
          var encodedData = window.btoa(email + ':' + pass);
          var promise = client.createRequest('token').asGet().withBaseUrl(this.authOrigin).withHeader('Authorization', 'Basic ' + encodedData).send();
          promise.then(this.loginHandle.bind(this));
          promise['catch'](this.errorHandler.bind(this));

          return promise;
        };

        Http.prototype.loginResourceOwner = function loginResourceOwner(email, pass) {
          var _this6 = this;

          this._showLoadingMask();
          var data = {
            grant_type: 'password',
            username: email,
            password: pass
          };

          var client = new HttpClient().configure(function (x) {
            x.withBaseUrl(_this6.authOrigin);
            x.withHeader('Content-Type', 'application/x-www-form-urlencoded');
          });

          var promise = client.post('token', $.param(data));
          promise.then(this.loginHandle.bind(this));
          promise['catch'](this.errorHandler.bind(this));

          return promise;
        };

        Http.prototype.initAuthHttp = function initAuthHttp(token) {
          var _this7 = this;

          this.token = token;
          this.authHttp = new HttpClient().configure(function (x) {
            x.withBaseUrl(_this7.origin);
            x.withHeader('Authorization', 'Bearer ' + _this7.token);
            x.withHeader('Content-Type', 'application/json');
          });
        };

        Http.prototype.getAuthHttpFor = function getAuthHttpFor(hostName) {
          var _this8 = this;

          var authHttp = new HttpClient().configure(function (x) {
            x.withBaseUrl(_this8.hosts[hostName]);
            x.withHeader('Authorization', 'Bearer ' + _this8.token);
            x.withHeader('Content-Type', 'application/json');
          });

          return authHttp;
        };

        Http.prototype._convertToArray = function _convertToArray(value) {
          var result = value || [];
          if (typeof result === 'string') {
            return result.split(',');
          }

          return result;
        };

        Http.prototype.loginHandle = function loginHandle(response) {
          this._hideLoadingMask();
          var data = JSON.parse(response.response);
          var token = data.access_token;
          this.initAuthHttp(token);

          var claims = data.userClaims || [];
          if (typeof claims === 'string') {
            claims = JSON.parse(claims);
          }

          this.session.setUser({
            token: token,
            userName: data.userName || 'please give me a name!',
            userClaims: claims,
            userRoles: this._convertToArray(data.userRoles),
            userAccessRights: this._convertToArray(data.userAccessRights)
          });
        };

        Http.prototype.errorHandler = function errorHandler(response) {
          this._hideLoadingMask();
          if (response.statusCode === 401) {
            this.logger.warn(this.locale.translate('sessionTimedOut'));
          } else if (response.statusCode === 403) {
            this.logger.warn(this.locale.translate('accessDenied'));
          } else if (response.statusCode === 500) {
            this.logger.error(this.locale.translate('internalServerError'));
          } else if (response.timeout === true) {
            this.logger.error(this.locale.translate('requestTimeout'));
          } else {
            this.logger.error(this.locale.translate('errorHappend'));
          }
        };

        var _Http = Http;
        Http = inject(Session, Logger, LoadingMask)(Http) || Http;
        return Http;
      })();

      _export('Http', Http);
    }
  };
});