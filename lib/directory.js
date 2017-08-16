'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const ms = require('ms');


/**
 * Serves a single endpoint for retreiving network statistics
 */
class Directory {

  /**
   * @constructor
   * @param {Node} node
   * @param {object} options
   * @param {boolean} options.enableSSL - Use SSL
   * @param {string} options.serviceKeyPath - Path to PEM private key
   * @param {string} options.certificatePath - Path to PEM certificate
   * @param {string[]} options.authorityChains - Path to PEM CA certificates
   */
  constructor(node, options) {
    this.node = node;
    this.database = this.node.database;

    /* istanbul ignore if */
    if (options.enableSSL) {
      this.server = https.createServer({
        key: fs.readFileSync(options.serviceKeyPath),
        cert: fs.readFileSync(options.certificatePath),
        ca: options.authorityChains
          ? options.authorityChains.map(fs.readFileSync)
          : []
      }, (req, res) => this._handleRequest(req, res));
    } else {
      this.server = http.createServer(
        (req, res) => this._handleRequest(req, res)
      );
    }
  }

  /**
   * @private
   */
  _handleRequest(req, res) {
    let now = Date.now();

    cors()(req, res, () => {
      this.database.PeerProfile.find({
        'capacity.timestamp': { $gt: now - ms('24HR') }
      }, [], {
        sort: { 'capacity.timestamp': -1 }
      }, (err, results) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results.map((r) => r.toObject())));
      });
    });
  }

  /**
   * Start the server on the supplied port and hostname
   * @param {number} port
   * @param {string} hostname
   * @param {function} callback
   */
  listen() {
    this.server.listen(...arguments);
  }

}

module.exports = Directory;