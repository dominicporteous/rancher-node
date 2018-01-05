'use strict'

const Joi = require('joi')
const Wreck = require('wreck')

const internals = {}
internals.schema = Joi.object({
    host: Joi.string().required(),
    port: Joi.number().required(),
    access_key: Joi.string().required(),
    secret_key: Joi.string().required(),
    environment: Joi.string(),
    protocol: Joi.string()
});

class RancherClient {
    constructor(config) {

        Joi.assert(config, internals.schema);


        this.environmentId = config.environment || '1a5';
        this.protocol = config.protocol || 'http';

        this._wreck = Wreck.defaults({
            baseUrl: `${this.protocol}://${config.host}:${config.port}`,
            headers: {
                Authorization: 'Basic ' + new Buffer(config.access_key + ':' + config.secret_key).toString('base64')
            }
        });

        this._request = (method, url, options) => {

            return new Promise((resolve, reject) => {

                this._wreck.request(method, url, options, (err, res) => {

                    if (err) {
                        return reject(err);
                    }

                    this._wreck.read(res, { json: true }, (err, payload) => {

                      if (res.statusCode < 200 ||
                          res.statusCode >= 300) {
                        const e = new Error(`Invalid response code: ${ res.statusCode }. Error: ${ payload.code }. Field: ${ payload.fieldName }. ${ payload.message }`);
                        e.statusCode = res.statusCode;
                        e.headers = res.headers;
                          
                        return reject(e);
                      }

                      if (err) {
                          return reject(err);
                      }

                      return resolve(payload);

                    });
                });
            });
        };

    };



    getRegistrationToken() {
        return (new Promise((resolve, reject) => {

          this._request('POST', '/registrationtokens').then(resp => {

            this._request('GET', '/registrationtokens/' + resp.id).then(resp => {

              resolve(resp.command)

            }).catch(err => {

              reject(err)

            })

          }).catch(err => {

            reject(err)

          })

        }))
    }

    createContainer(container) {
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container`, { payload: JSON.stringify(container) });
    };

    getContainer(containerId) {

        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('get', `/v2-beta/projects/${this.environmentId}/container/${containerId}`);
    }

    updateContainer(container) {
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container/${container.id}`, { payload: JSON.stringify(container) });
    }

    stopContainer(containerId, stopParams) {
        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container/${containerId}/?action=stop`, { payload: JSON.stringify(stopParams) });
    }

    startContainer(containerId) {
        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container/${containerId}/?action=start`);
    }

    restartContainer(containerId) {
        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container/${containerId}/?action=restart`);
    }

    removeContainer(containerId) {
        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('delete', `/v2-beta/projects/${this.environmentId}/container/${containerId}`);
    }

    purgeContainer(containerId) {
        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container/${containerId}/?action=purge`);
    }

    getContainerLogs(containerId) {
        Joi.assert(containerId, Joi.string().required(), 'Must specify container id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/container/${containerId}/?action=logs`);
    }

    createStack(stack) {
        return this._request('post', `/v2-beta/projects/${this.environmentId}/stack`, { payload: JSON.stringify(stack) });
    }

    getStack(stackId) {
        Joi.assert(stackId, Joi.string().required(), 'Must specify stack id');
        return this._request('get', `/v2-beta/projects/${this.environmentId}/stack/${stackId}`);
    }

    removeStack(stackId) {
        Joi.assert(stackId, Joi.string().required(), 'Must specify stack id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/stack/${stackId}/?action=remove`);
    }


    getStackServices(stackId) {
        Joi.assert(stackId, Joi.string().required(), 'Must specify stack id');
        return this._request('get', `/v2-beta/projects/${this.environmentId}/stack/${stackId}/services`);
    }

    startStackServices(stackId) {
        Joi.assert(stackId, Joi.string().required(), 'Must specify stack id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/stack/${stackId}/?action=activateservices`);
    }

    stopStackServices(stackId) {
        Joi.assert(stackId, Joi.string().required(), 'Must specify stack id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/stack/${stackId}/?action=deactivateservices`);
    }

    getPorts() {
        return this._request('get', `/v2-beta/projects/${this.environmentId}/ports`);
    }

    getHosts() {
        return this._request('get', `/v2-beta/projects/${this.environmentId}/hosts`);
    }

    getHost(hostId) {
        return this._request('get', `/v2-beta/projects/${this.environmentId}/hosts/${hostId}`);
    }

    getServices(query) {
        return this._request('get', `/services?${query}`);
    }

    getService(serviceId) {

        Joi.assert(serviceId, Joi.string().required(), 'Must specify service id');
        return this._request('get', `/v2-beta/projects/${this.environmentId}/services/${serviceId}`);
    }

    getServiceStats(serviceId) {
        Joi.assert(serviceId, Joi.string().required(), 'Must specify service id')
        return this._request('get', `/services/${serviceId}/containerstats`)
    }

    stopService(serviceId) {
        Joi.assert(serviceId, Joi.string().required(), 'Must specify service id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/services/${serviceId}/?action=deactivate`);
    }

    startService(serviceId) {
        Joi.assert(serviceId, Joi.string().required(), 'Must specify service id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/services/${serviceId}/?action=activate`);
    }

    restartService(serviceId, restartParams) {
        Joi.assert(serviceId, Joi.string().required(), 'Must specify service id');
        return this._request('post', `/v2-beta/projects/${this.environmentId}/services/${serviceId}/?action=restart`, { payload: JSON.stringify(restartParams) });
    }


    createVolume(volume) {
      return this._request('post', `/v2-beta/projects/${this.environmentId}/volume`, { payload: JSON.stringify( volume ) })
    }

    getVolume(volumeId) {
      Joi.assert(volumeId, Joi.string().required(), 'Must specify volumeId')
      return this._request('get', `/v2-beta/projects/${this.environmentId}/volume/${volumeId}`)
    }
    removeVolume(volumeId) {
      Joi.assert(volumeId, Joi.string().required(), 'Must specify volumeId')
      return this._request('post', `/v2-beta/projects/${this.environmentId}/volume/${volumeId}/?action=remove`)
    }
};

module.exports = RancherClient;
