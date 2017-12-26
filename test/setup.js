'use strict';
require("babel-core/register");
require("babel-polyfill");

const chai = require('chai');
chai.should();

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-shallow-deep-equal'));